import type { NextApiRequest, NextApiResponse } from "next";
import { Options, PythonShell } from "python-shell";
import { writeFileSync } from "fs";
import { clearDriftless, setDriftlessInterval } from "driftless";
import { deepParseJson } from "deep-parse-json";
import { Server } from "socket.io";
import tmp from "tmp";
import pidusage from "pidusage";
import boilerplate from "../../lib/boilerplate";

// Used to send stdout messages to client
interface Response {
	timestamp?: number;
	counter?: number;
	chunk?: boolean;
	message: string;
}

// Used to send frame updates to client
export interface Update {
	timestamp: number;
	counter: number;
	type: "start" | "data";
	id: string;
	size?: { x: number; y: number };
	bg?: { r: number; g: number; b: number };
	camera?: { x: number; y: number };
	points?: { x: number; y: number }[];
	color?: { r: number; g: number; b: number };
	border?: { r: number; g: number; b: number };
	borderThickness?: number;
	layer?: number;
	fixed?: boolean;
}

const PYTHON_KEY = process.env.PYTHON_KEY as string; // Random key to detect system messages
const BUFFER_TIME = 50; // Milliseconds
const MAX_BUFFER = 50000; // Bytes
const MAX_RUN_TIME = 120; // Minutes
const MAX_TOTAL_CPU = 15000; // Maximum amount of % cpu allowed by process
const MAX_CPU_PER_SECOND = 35; // Maximum amount of % cpu allowed by process per second
const TIMES_TO_TRIGGER = 5; // Number of times past cpu limit per second needed to exit process

let instances: { [id: string]: PythonShell } = {};
let firstRun = false;

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<string>
) {
	return new Promise(async (resolve, reject) => {
		// Kill all python instances when server is killed (only needs to be established once)
		if (!firstRun) {
			process.on("exit", () => {
				for (let instance of Object.values(instances)) {
					instance.kill();
				}
			});
			firstRun = true;
		}

		// Create websocket if it doesn't already exist
		if (!(res.socket as any).server.io) {
			const io = new Server((res.socket as any).server);

			io.on("connection", (socket) => {
				console.log("a user connected");
				let runBefore = false;
				let canvasCreated = false;

				socket.on("run", async (code: string) => {
					// If run is called twice with same socket, kill socket automatically to prevent socket abuse
					if (runBefore) {
						kill();
						return res.status(200).send("Done");
					}
					runBefore = true;

					function kill() {
						file.removeCallback();
						python.kill();
						socket.emit("error", "Resource Limit Exceeded");

						// Make sure all messages have sent before disconnecting
						setTimeout(() => {
							socket.disconnect();
						}, 1000);

						clearDriftless(interval1);
						clearDriftless(interval2);
						if (stdoutInterval) clearDriftless(stdoutInterval);
					}

					// Establish python timeout
					setTimeout(kill, MAX_RUN_TIME * 60 * 1000); // Convert from minutes to milliseconds

					if (!code) {
						socket.emit("error", "Invalid Request");
						return resolve("Error");
					}

					// Write user code to file combined with boilerplate (from boilerplate.ts)
					const file = tmp.fileSync({ postfix: ".py" });

					code = `${boilerplate}\n\n${code}`;

					writeFileSync(file.name, code);

					// Create python instances in unbuffered mode so all stdout messages are sent immediately
					const options: Options = {
						mode: "text",
						pythonPath: "python3",
						pythonOptions: ["-u"],
						detached: false,
					};
					const python = new PythonShell(file.name, options);
					instances[socket.id] = python;

					let cpuUsage = 0;
					let timesPastLimit = 0;
					let updates: Update[] = [];
					let stdoutInterval: number | undefined = undefined;
					let buffer = "";
					let counter = 1; // Counter ensures that all updates are executed in the proper order on the client

					// Let client know that program successfully initiated
					updates.push({
						id: "start",
						timestamp: Date.now(),
						type: "start",
						counter: 0,
					});

					// When an interaction is received from the client, send it to python to be handled by "boilerplate.ts"
					for (let ev of [
						"mousemove",
						"mousedrag",
						"mousedown",
						"mouseup",
						"doubleclick",
						"rightclick",
						"keydown",
						"keyup",
						"releaseall",
					]) {
						socket.on(ev, (data) => {
							data.event = ev;
							python.send(`${PYTHON_KEY} ${JSON.stringify(data)}`);
						});
					}

					// Send current updates (if any) every frame, ≈16ms
					let interval1 = setDriftlessInterval(() => {
						if (socket.disconnected) {
							clearDriftless(interval1);
						}
						if (updates.length > 0) {
							socket.emit("updates", updates);
							updates = [];
						}
					}, 16);

					// If process is being abused (cpu load is too high for too long), kill process
					let interval2 = setDriftlessInterval(() => {
						pidusage(python.childProcess.pid as number, function (err, stats) {
							if (socket.disconnected || err) {
								return clearDriftless(interval2);
							}

							cpuUsage += stats.cpu;
							console.log(Object.keys(instances));
							console.log(stats.cpu, cpuUsage, timesPastLimit);

							if (stats.cpu > MAX_CPU_PER_SECOND) {
								timesPastLimit++;
							}
							if (
								cpuUsage > MAX_TOTAL_CPU ||
								timesPastLimit >= TIMES_TO_TRIGGER
							) {
								kill();
							}
						});
					}, 1000);

					// Defines how to split up response into chunks if it is too large
					function respond(time?: number): void {
						let flag = false;

						while (
							Buffer.byteLength(buffer) > MAX_BUFFER ||
							(flag && buffer !== "")
						) {
							flag = true;

							const message = Buffer.from(buffer).toString(
								"utf8",
								0,
								MAX_BUFFER
							);

							socket.emit("stdout", {
								timestamp: time || Date.now(),
								counter: counter,
								message: message,
								chunk: true,
							} as Response);

							buffer = buffer.substring(message.length);
							counter++;
						}

						socket.emit("stdout", {
							timestamp: time || Date.now(),
							counter: counter,
							message: buffer,
						} as Response);

						buffer = "";
						counter++;
					}

					// Send python errors to user and close socket and python instance
					python.on("pythonError", (error) => {
						let response = {
							message: error,
							timestamp: Date.now(),
							counter: counter,
						};
						socket.emit("pythonError", response);
						counter++;

						instances[socket.id]?.kill();
						delete instances[socket.id];
						socket.disconnect();

						return resolve("Close");
					});

					python.on("message", (message: string) => {
						const currentTime = Date.now();

						// Stdout message starts with custom key: indicates frame updates
						if (message.startsWith(PYTHON_KEY)) {
							const parts = message.split(PYTHON_KEY).slice(1); // Split message at key and remove empty first reference
							for (let part of parts) {
								const update = deepParseJson(part);

								// If object has already been changed this frame, simply overwrite the change, otherwise add as new update
								let updateIndex = updates.findIndex((e) => update.id === e.id);
								if (updateIndex === -1) updateIndex = updates.length;

								// Create canvas if it hasn't already been created, otherwise update its properties
								if (update.size && !canvasCreated) {
									updates[updateIndex] = {
										timestamp: update.timestamp * 1000, // Converts python timestamp to js timestamp
										type: "data",
										id: "createCanvas",
										size: { x: update.size.x, y: update.size.y },
										bg: { r: update.bg.r, g: update.bg.g, b: update.bg.b },
										camera: { x: update.camera.x, y: update.camera.y },
										counter: counter,
									};
									canvasCreated = true;
								} else if (update.size) {
									updates[updateIndex] = {
										timestamp: update.timestamp * 1000, // Converts python timestamp to js timestamp
										type: "data",
										id: "updateCanvas",
										size: { x: update.size.x, y: update.size.y },
										bg: { r: update.bg.r, g: update.bg.g, b: update.bg.b },
										camera: { x: update.camera.x, y: update.camera.y },
										counter: counter,
									};
								} else {
									// If object is created before a canvas is, create a default canvas
									if (!canvasCreated) {
										updates.push({
											timestamp: update.timestamp * 1000, // Converts python timestamp to js timestamp
											type: "data",
											id: "createCanvas",
											size: { x: 200, y: 200 },
											bg: { r: 255, g: 255, b: 255 },
											camera: { x: 0, y: 0 },
											counter: counter,
										});
										counter++;
										updateIndex = updates.length;
									}

									// Normal object update
									updates[updateIndex] = {
										timestamp: update.timestamp * 1000, // Converts python timestamp to js timestamp
										type: "data",
										id: update.id,
										points: update.points.map((point: any) => {
											return {
												x: point.x,
												y: point.y,
											};
										}),
										color: {
											r: update.color.r,
											g: update.color.g,
											b: update.color.b,
										},
										border: {
											r: update.border?.r,
											g: update.border?.g,
											b: update.border?.b,
										},
										borderThickness: update.border_thickness,
										fixed: update.fixed,
										layer: update.layer,
										counter: counter,
									};
								}
								counter++;
							}
						} else if (buffer === "") {
							// Stdout message
							buffer = message;

							// Create loop to respond if messages exist (only happens once)
							if (stdoutInterval === undefined) {
								stdoutInterval = setDriftlessInterval(() => {
									if (buffer) {
										respond(currentTime);
									}
								}, BUFFER_TIME);
							}
						} else {
							// Message in buffer, so just add to it
							buffer += "\n" + message;
						}
					});

					// When program finishes, send any updates left, plus finish message, and kill socket and python instance
					python.on("close", () => {
						file.removeCallback();
						if (buffer) {
							respond();
						}
						if (updates.length > 0) {
							socket.emit("updates", updates);
						}

						socket.emit("finish", {
							timestamp: Date.now(),
							counter: counter,
						});

						instances[socket.id]?.kill();
						delete instances[socket.id];
						socket.disconnect();

						return resolve("Close");
					});
				});
				// Kill python instance when socket running it disconnects
				socket.on("disconnect", () => {
					instances[socket.id]?.kill();
					delete instances[socket.id];
					console.log("a user disconnected");
				});
			});

			(res.socket as any).server.io = io;
		}
		res.status(200).send("Done");
	});
}
