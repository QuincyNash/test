import { spawn } from "child_process";
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
	message: string;
};

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	return new Promise(async () => {
		const ls = spawn("python3", ["--version"]);

		ls.stdout.on("data", (data) => {
			return res.status(200).json({ message: data.toString() });
		});
	});
}
