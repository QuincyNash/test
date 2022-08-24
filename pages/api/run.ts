import type { NextApiRequest, NextApiResponse } from "next";
import admin from "firebase-admin";
import { PythonShell } from "python-shell";
import { writeFileSync } from "fs";
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

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<Response>
) {
	return new Promise(async (resolve, reject) => {
		initialize();
		const db = admin.database();

		let { code, channel } = JSON.parse(req.body || "");

		if (!code || !channel) {
			return res.status(200).json({ message: "Invalid Request" });
		}

		const data = await db.ref(`connections/${channel}`).get();
		if (!data.exists()) {
			return res.status(200).json({ message: "Invalid Request" });
		}

		const file = tmp.fileSync({ postfix: ".py" });

		code = `${boilerplate}\n\n${code}`;
		console.log(code);

		writeFileSync(file.name, code);

		const options: any = {
			mode: "text",
			pythonPath: "python3",
			pythonOptions: ["-u"],
		};
		const python = new PythonShell(file.name, options);

		const BUFFER_TIME = 50; // Milliseconds
		const MAX_BUFFER = 8000; // Bytes
		let bufferStartTime = 0;
		let buffer = "";
		let counter = 0;

		python.send(Math.random() < 0.5 ? "a" : "b");

		function respond(time?: number) {
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

		python.on("message", (message) => {
			const currentTime = Date.now();

			if (buffer === "") {
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
			return res.status(200).json({
				timestamp: Date.now(),
				counter: counter,
				message: "Finished",
			});
		});
	});
}
