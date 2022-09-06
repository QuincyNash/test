import Pusher from "pusher-js";
import { useState, useEffect } from "react";
import p5Types from "p5";
import { Update } from "./api/run";
import P5Sketch, { Setup, Draw } from "../components/P5Sketch";
import { render } from "../lib/renderer";
import io from "socket.io-client";
import RunButton from "../components/RunButton";

interface Output {
	type: "stdout" | "exit";
	data: string;
	timestamp: number;
	counter: number;
	chunk?: boolean;
}

export interface Object {
	id: string;
	points: { x: number; y: number }[];
	color: { r: number; g: number; b: number };
}

let outputs: (Output | Update)[] = [];
let objects: Object[] = [];

function insert(array: (Output | Update)[], value: Output | Update): void {
	array.push(value);
	array.sort((a, b) => b.counter - a.counter);
}

export default function Home() {
	const [channel, setChannel] = useState<string | null>(null);
	const [setup, setSetup] = useState<Setup>((p5) => {});
	const [draw, setDraw] = useState<Draw>((p5) => {});
	const [stoppable, setStoppable] = useState(true);

	useEffect(() => {
		(async () => {
			const res = await fetch("api/connect", {
				method: "GET",
			});
			const json = await res.json();

			setChannel(json.message);
		})();
	}, []);

	useEffect(() => {
		(async () => {
			const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY as string, {
				cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
			});

			if (channel) {
				await fetch("/api/run");
				const socket = io();

				const subscribed = pusher.subscribe(channel);
				subscribed.bind("stdout", (data: any) => {
					insert(outputs, {
						type: "stdout",
						data: data.message,
						timestamp: data.timestamp,
						counter: data.counter,
						chunk: data.chunk,
					});
				});
				subscribed.bind("updates", (data: Update[]) => {
					for (let update of data) {
						insert(outputs, update);
					}
				});
			}
		})();
	}, [channel]);

	return (
		<>
			<div>
				<div className="flex">
					<textarea
						className="border border-blue-600 rounded-md"
						style={{ resize: "both" }}
						id="code"
						name="code"
						placeholder="Code"
					></textarea>
					<RunButton
						onRun={async () => {
							function displayUpdates(): void {
								const currentTime = Date.now();
								let stop = false;

								for (let i = outputs.length - 1; i >= 0; i--) {
									let output = outputs[i] as any;

									if (
										output.timestamp + MESSAGE_DELAY <= currentTime &&
										output.counter === counter
									) {
										if (output.type === "stdout") {
											const elem = document.querySelector(
												"#output"
											) as HTMLParagraphElement;

											if (!output.chunk && elem.innerText !== "") {
												elem.innerText += "\n" + output.data;
											} else {
												elem.innerText += output.data;
											}
										} else if (output.type === "exit") {
											stop = true;
										} else if (
											(output.type === "2d" || output.type === "3d") &&
											output.size
										) {
											setSetup(() => (p5: p5Types) => {
												p5.createCanvas(
													output.size.x,
													output.size.y,
													output.type === "3d" ? p5.WEBGL : p5.P2D
												);
											});
											setDraw(() => (p5: p5Types) => {
												p5.background(255);
												for (let object of objects) {
													render(p5, object);
												}
											});
										} else if (output.type === "2d") {
											let index = objects.findIndex((o) => o.id == output.id);
											if (index !== -1) {
												objects.splice(index, 1);
											}

											objects.push({
												id: output.id,
												points: output.points,
												color: output.color,
											});
										} else if (output.type === "3d") {
											objects.push({
												id: output.id,
												points: output.points,
												color: output.color,
											});
										}
										counter++;
										outputs.splice(i, 1);
									}
								}
								if (stop) {
									outputs = [];
									counter = 0;
								} else {
									requestAnimationFrame(displayUpdates);
								}
							}

							setStoppable(false);
							setTimeout(() => {
								setStoppable(true);
							}, 1);

							objects = [];

							const MESSAGE_DELAY = 200; // Milliseconds
							let counter = 0;

							requestAnimationFrame(displayUpdates);

							const elem = document.querySelector(
								"#output"
							) as HTMLParagraphElement;
							elem.innerText = "";

							const res = await fetch("api/run", {
								method: "POST",
								body: JSON.stringify({
									code: (document.querySelector("#code") as HTMLInputElement)
										.value,
									channel,
								}),
							});
							const json = await res.json();

							if (json.message === "Invalid Request") {
								outputs = [];
								counter = 0;
							} else {
								insert(outputs, {
									type: "exit",
									data: "Success",
									timestamp: Date.now(),
									counter: json.counter,
								});
							}
						}}
						onStop={() => {
							outputs = [];
							objects = [];
							setSetup(() => () => {});
							setDraw(() => () => {});
						}}
						stoppable={stoppable}
					></RunButton>
				</div>
				<P5Sketch setup={setup} draw={draw}></P5Sketch>
				<p id="output"></p>
			</div>
		</>
	);
}
