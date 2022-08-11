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

	// const filePath = path.join(
	// 	__dirname,
	// 	"..",
	// 	"..",
	// 	`${crypto.randomBytes(16).toString("hex")}.py`
	// );

	// writeFileSync(filePath, code);

	// // console.log(filePath);

	const split = code.split(" ");
	const command = split[0] || "";
	const args = split.length > 1 ? code.split(" ").slice(1) : undefined;

	return new Promise(async () => {
		// const ls = spawn("python3", [filePath]);
		const ls = spawn(command, args, {
			shell: true,
		});

		ls.stdout.on("data", (data) => {
			return res.status(200).json({ message: data.toString() });
		});

		ls.on("exit", () => {
			// unlinkSync(filePath);
		});
	});
}
