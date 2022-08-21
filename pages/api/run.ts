import type { NextApiRequest, NextApiResponse } from "next";
import { PythonShell } from "python-shell";
import { writeFileSync } from "fs";
import tmp from "tmp";

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<{ message: string }>
) {
	return new Promise(async (resolve, reject) => {
		const code = req.body;

		if (!code) {
			res.status(200).json({ message: "Invalid Request" });
		}

		const file = tmp.fileSync({ postfix: ".py" });

		writeFileSync(file.name, code);

		const options: any = {
			mode: "text",
			pythonPath: "python3",
			pythonOptions: ["-u"],
		};
		const python = new PythonShell(file.name, options);
		let result = "";

		python.send(Math.random() < 0.5 ? "a" : "b");

		python.on("message", (message) => {
			result += message + "\n";
			console.log(message);
		});

		python.on("close", () => {
			res.status(200).json({ message: result });
		});
	});
}
