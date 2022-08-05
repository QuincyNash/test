import { spawn } from "child_process";
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
	message: string;
};

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	const code = req.body as string;

	const firstCommand = code.split(" ")[0];
	const args = code.split(" ").slice(1);

	return new Promise(async () => {
		const ls = spawn(firstCommand, args);

		ls.stdout.on("data", (data) => {
			return res.status(200).json({ message: data.toString() });
		});
	});
}
