import { useState, useEffect, useCallback } from "react";
import p5Types from "p5";
import { throttle } from "throttle-debounce";
import { Update } from "./api/run";
import P5Sketch, { Sketch } from "../components/P5Sketch";
import { render, sendEvent } from "../lib/renderer";
import io, { Socket } from "socket.io-client";
import Editor from "../components/Editor";
import SidePanel from "../components/SidePanel";
import Header from "../components/Header";

export interface Scene {
	width: number;
	height: number;
	bg: {
		r: number;
		g: number;
		b: number;
	};
	camera: { x: number; y: number };
}

interface Output {
	type: "stdout" | "exit" | "error";
	data: string;
	timestamp: number;
	counter: number;
	chunk?: boolean;
}

export interface Object {
	id: string;
	points: { x: number; y: number }[];
	color: { r: number; g: number; b: number };
	border: { r: number; g: number; b: number };
	borderThickness: number;
	layer: number;
	fixed: boolean;
}

const DEFAULT_CODE = `from uhs_graphics import *

scene = Scene(200, 200)
scene.camera.follow(scene.mouse)
objects.Square()
objects.Square(fixed=True)

wait_for_events()`;

let scene: Scene = {
	width: 200,
	height: 200,
	bg: { r: 255, g: 255, b: 255 },
	camera: { x: 0, y: 0 },
};
let oldScene: Scene | null = null;
let outputs: (Output | Update)[] = [];
let objects: Object[] = [];
let changed = false;
let finished = false;
let counter = 0;
let socket: Socket | null = null;
let code = DEFAULT_CODE;

function insert(array: (Output | Update)[], value: Output | Update): void {
	array.push(value);
	array.sort((a, b) =>
		b.timestamp - a.timestamp === 0
			? b.counter - a.counter
			: b.timestamp - a.timestamp
	);
}

function resetVariables(): void {
	scene = {
		width: 200,
		height: 200,
		bg: { r: 255, g: 255, b: 255 },
		camera: { x: 0, y: 0 },
	};
	oldScene = null;
	outputs = [];
	objects = [];
	counter = 0;
	changed = false;
	finished = false;
}

export default function Home() {
	const [sketch, setSketch] = useState<Sketch>(() => {});
	const [running, setRunning] = useState<"yes" | "no" | "starting">("no");

	const createSocket = useCallback(async () => {
		const newSocket = io(
			process.env.NODE_ENV === "development"
				? "http://localhost:3000"
				: "https://main.d1q6bneobbhjda.amplifyapp.com"
		);

		newSocket.on("stdout", (data: any) => {
			insert(outputs, {
				type: "stdout",
				data: data.message,
				timestamp: data.timestamp,
				counter: data.counter,
				chunk: data.chunk,
			});
		});

		newSocket.on("updates", (data: Update[]) => {
			for (let update of data) {
				insert(outputs, update);
			}
		});

		socket = newSocket;
	}, []);

	useEffect(() => {
		(async () => {
			if (!socket) {
				await fetch("/api/run");
				await createSocket();
			}
		})();
	}, [createSocket]);

	useEffect(() => {
		document.addEventListener("visibilitychange", (event) => {
			if (document.hidden) {
				socket?.emit("releaseall", {});
			}
		});
	}, []);

	async function onRun() {
		const MESSAGE_DELAY = 20; // Milliseconds

		function displayUpdates(): void {
			const currentTime = Date.now();
			let stop = false;

			for (let i = outputs.length - 1; i >= 0; i--) {
				let output = outputs[i] as any;

				if (
					output.timestamp + MESSAGE_DELAY <= currentTime &&
					output.counter >= counter
				) {
					console.log(output);

					if (output.type === "start") {
						setRunning("yes");
					} else if (output.type === "exit") {
						stop = true;
					} else if (output.type === "stdout" || output.type === "error") {
						const elem = document.querySelector(
							"#output"
						) as HTMLParagraphElement;

						if (!output.chunk && elem.innerText !== "") {
							elem.innerText += "\n" + output.data;
						} else {
							elem.innerText += output.data;
						}
					} else if (output.id === "createCanvas") {
						scene.width = output.size.x;
						scene.height = output.size.y;
						scene.camera = { x: output.camera.x, y: output.camera.y };

						setSketch(() => (p5: p5Types) => {
							p5.setup = () => {
								p5.createCanvas(output.size.x, output.size.y);
							};
							p5.draw = () => {
								let shouldRender =
									changed ||
									scene.bg.r !== oldScene?.bg.r ||
									scene.bg.g !== oldScene.bg.g ||
									scene.bg.b !== oldScene.bg.b ||
									scene.camera.x !== oldScene.camera.x ||
									scene.camera.y !== oldScene.camera.y;

								if (finished) p5.noLoop();

								if (
									scene.width !== oldScene?.width ||
									scene.height !== oldScene?.height
								) {
									p5.resizeCanvas(scene.width, scene.height);
									shouldRender = true;
								}

								if (shouldRender) {
									p5.background(scene.bg.r, scene.bg.g, scene.bg.b);
									for (let object of objects) {
										render(p5, scene, object);
									}
									changed = false;
								}
								oldScene = JSON.parse(JSON.stringify(scene));
							};
							p5.mouseMoved = throttle(16, () => {
								sendEvent(p5, socket, "mousemove", {});
							});
							p5.mouseDragged = throttle(16, () => {
								sendEvent(p5, socket, "mousedrag", {});
							});
							p5.mousePressed = (event) => {
								if (p5.mouseButton === p5.RIGHT) {
									sendEvent(p5, socket, "rightclick", event);
								} else {
									sendEvent(p5, socket, "mousedown", event);
								}
							};
							p5.mouseReleased = (event) => {
								if (p5.mouseButton !== p5.RIGHT) {
									sendEvent(p5, socket, "mouseup", event);
								}
							};
							p5.doubleClicked = (event) => {
								sendEvent(p5, socket, "doubleclick", event);
							};
							p5.keyPressed = (event: any) => {
								sendEvent(p5, socket, "keydown", event);
							};
							p5.keyReleased = (event: any) => {
								sendEvent(p5, socket, "keyup", event);
							};
						});
					} else if (output.id === "updateCanvas") {
						scene.width = output.size.x;
						scene.height = output.size.y;
						scene.bg = {
							r: output.bg.r,
							g: output.bg.g,
							b: output.bg.b,
						};
						scene.camera = {
							x: output.camera.x,
							y: output.camera.y,
						};
					} else if (output.type === "data") {
						let index = objects.findIndex((o) => o.id == output.id);
						if (index !== -1) {
							objects.splice(index, 1);
						}

						objects.push({
							id: output.id,
							points: output.points,
							color: output.color,
							border: output.border,
							borderThickness: output.borderThickness,
							fixed: output.fixed,
							layer: output.layer,
						});
						objects.sort((a, b) => a.layer - b.layer);
						changed = true;
					}
					counter++;
					outputs.splice(i, 1);
				}
			}
			if (stop) {
				socket?.disconnect();
				finished = true;
				setRunning("no");
			} else {
				requestAnimationFrame(displayUpdates);
			}
		}

		await createSocket();
		resetVariables();

		requestAnimationFrame(displayUpdates);

		const elem = document.querySelector("#output") as HTMLParagraphElement;
		elem.innerText = "";

		socket?.emit("run", code);
		setRunning("starting");

		socket?.on("error", (data) => {
			console.error(data);
			socket?.disconnect();
			setRunning("no");
			finished = true;
		});

		socket?.on("pythonError", (error) => {
			console.log(error);
			insert(outputs, {
				type: "error",
				data: error.message,
				timestamp: error.timestamp,
				counter: error.counter,
			});
		});

		socket?.on("finish", (data) => {
			insert(outputs, {
				type: "exit",
				data: "Success",
				timestamp: data.timestamp,
				counter: data.counter,
			});
		});
	}

	async function onStop() {
		resetVariables();
		socket?.disconnect();
		setRunning("no");
		setSketch(() => () => {});
	}

	return (
		<div className="flex flex-col w-screen h-screen">
			<Header onRun={onRun} onStop={onStop} running={running}></Header>
			<main className="grow-0 shrink flex min-h-full p-2 overflow-auto bg-black">
				<SidePanel></SidePanel>
				<Divider></Divider>
				<Editor
					default={code}
					onChange={(value) => {
						code = value;
					}}
				></Editor>
				<Divider></Divider>
				<P5Sketch sketch={sketch}></P5Sketch>
				<p id="output"></p>
			</main>
		</div>
	);
}

function Divider() {
	return <div className="cursor-ew-resize w-2"></div>;
}
