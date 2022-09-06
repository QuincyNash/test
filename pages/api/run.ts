import type { NextApiRequest, NextApiResponse } from "next";
import admin from "firebase-admin";
import { PythonShell } from "python-shell";
import { writeFileSync } from "fs";
import { setDriftlessInterval } from "driftless";
import { deepParseJson } from "deep-parse-json";
import { Server } from "socket.io";
import tmp from "tmp";
import initialize from "../../lib/firebase";
import pusher from "../../lib/pusher";
import boilerplate from "../../lib/boilerplate";

interface Response {
	timestamp?: number;
	counter?: number;
	chunk?: boolean;
	message: string;
}

export interface Update {
	timestamp: number;
	counter: number;
	type: "2d" | "3d";
	id: string;
	size?: { x: number; y: number };
	points?: { x: number; y: number }[];
	color?: { r: number; g: number; b: number };
}

const PYTHON_KEY = "iZp6JK0WyW152Tqb68FxdkONgBKVG3G9";

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<Response>
) {
	return new Promise(async (resolve, reject) => {
		if (!(res.socket as any).server.io) {
			const io = new Server((res.socket as any).server);

			io.on("connection", (socket) => {
				console.log("a user connected");
				socket.on("run", (code: string) => {
					socket.emit("stdout", "abc");
				});
				socket.on("disconnect", () => {
					console.log("a user disconnected");
				});
			});

			(res.socket as any).server.io = io;
		}

		initialize();
		const db = admin.database();

		let { code, channel } = JSON.parse(req.body || "{}");

		if (!code || !channel) {
			return res.status(200).json({ message: "Invalid Request" });
		}

		const data = await db.ref(`connections/${channel}`).get();
		if (!data.exists()) {
			return res.status(200).json({ message: "Invalid Request" });
		}

		const file = tmp.fileSync({ postfix: ".py" });

		code = `${boilerplate}\n\n${code}`;
		// console.log(code);

		writeFileSync(file.name, code);

		const options: any = {
			mode: "text",
			pythonPath: "python3",
			pythonOptions: ["-u"],
		};
		const python = new PythonShell(file.name, options);

		const BUFFER_TIME = 50; // Milliseconds
		const MAX_BUFFER = 8000; // Bytes
		let updates: Update[] = [];
		let bufferStartTime = 0;
		let buffer = "";
		let counter = 0;

		setDriftlessInterval(() => {
			if (updates.length > 0) {
				pusher.trigger(channel, "updates", updates);
				updates = [];
			}
		}, 16);

		// python.send(Math.random() < 0.5 ? "a" : "b");

		function respond(time?: number): void {
			let flag = false;

			while (
				Buffer.byteLength(buffer) > MAX_BUFFER ||
				(flag && buffer !== "")
			) {
				flag = true;

				const message = Buffer.from(buffer).toString("utf8", 0, MAX_BUFFER);

				pusher.trigger(channel, "stdout", {
					timestamp: time || Date.now(),
					counter: counter,
					message: message,
					chunk: true,
				} as Response);

				buffer = buffer.substring(message.length);
				counter++;
			}

			pusher.trigger(channel, "stdout", {
				timestamp: time || Date.now(),
				counter: counter,
				message: buffer,
			} as Response);

			buffer = "";
			counter++;
		}

		python.on("pythonError", console.log);

		python.on("message", (message: string) => {
			const currentTime = Date.now();
			console.log(message);

			if (message.startsWith(PYTHON_KEY)) {
				message = message.slice(PYTHON_KEY.length + 1);
				const update = deepParseJson(message);

				if (update.size) {
					updates.push({
						timestamp: update.timestamp * 1000,
						type: update.type,
						id: "createCanvas",
						size: { x: update.size.x, y: update.size.y },
						counter: counter,
					});
				} else {
					updates.push({
						timestamp: update.timestamp * 1000,
						type: update.type,
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
						counter: counter,
					});
				}
				counter++;
			} else if (buffer === "") {
				buffer = message;
				bufferStartTime = currentTime;

				setInterval(() => {
					if (buffer) {
						respond(currentTime);
					}
				}, BUFFER_TIME);
			} else {
				buffer += buffer === "" ? message : "\n" + message;
			}
		});

		python.on("close", () => {
			if (buffer) {
				respond();
			}
			console.log("CLOSE");

			return res.status(200).json({
				timestamp: Date.now(),
				counter: counter,
				message: "Finished",
			});
		});
	});
}
