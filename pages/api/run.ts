import { spawn } from "child_process";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import crypto from "crypto";
import { writeFileSync, unlinkSync } from "fs";

type Data = {
	message: string;
};

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	const code = req.body as string;

	const filePath = path.join(
		__dirname,
		"..",
		"..",
		`${crypto.randomBytes(16).toString("hex")}.py`
	);

	writeFileSync(filePath, code);

	console.log(filePath);

	const command = code.split(" ")[0];
	const args = code.split(" ").slice(1);

	return new Promise(async () => {
		const ls = spawn("python3", [filePath]);

		ls.stdout.on("data", (data) => {
			console.log(data.toString());
			return res.status(200).json({ message: data.toString() });
		});

		ls.on("exit", () => {
			// unlinkSync(filePath);
			console.log("DONE");
		});
	});
}
