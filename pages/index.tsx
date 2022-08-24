import Pusher from "pusher-js";
import cloneDeep from "clone-deep";
import { useState, useEffect, useMemo } from "react";

interface Output {
	type: "stdout" | "exit";
	data: string;
	timestamp: number;
	counter: number;
	chunk?: boolean;
}

let outputs: Array<Output> = [];

function insert(array: Output[], value: Output) {
	array.push(value);
	array.sort((a, b) => b.counter - a.counter);
}

export default function Home() {
	const [channel, setChannel] = useState<string | null>(null);
	const [running, setRunning] = useState(false);

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
			}
		})();
	}, [channel]);

	return (
		<>
			<div>
				<form
					onClick={async (e) => {
						function displayUpdates() {
							abc += 1;
							const currentTime = Date.now();
							let stop = false;

							for (let i = outputs.length - 1; i >= 0; i--) {
								const output = outputs[i];

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
									}
									counter++;
									outputs.splice(i, 1);
								}
							}
							if (stop) {
								stopProgram();
							} else {
								requestAnimationFrame(displayUpdates);
							}
						}

						function stopProgram() {
							setRunning(false);
							outputs = [];
							counter = 0;
						}

						e.preventDefault();

						if (running) return;
						setRunning(true);

						const MESSAGE_DELAY = 200; // Milliseconds
						let counter = 0;
						let abc = 0;

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
							stopProgram();
						} else {
							insert(outputs, {
								type: "exit",
								data: "Success",
								timestamp: Date.now(),
								counter: json.counter,
							});
						}
					}}
				>
					<textarea id="code" name="code" placeholder="Code"></textarea>
					<button type="submit">Submit</button>
				</form>
				<p id="output"></p>
			</div>
		</>
	);
}
