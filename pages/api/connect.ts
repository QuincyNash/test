import { NextApiRequest, NextApiResponse } from "next";
import admin from "firebase-admin";
import { v4 as uuid } from "uuid";
import initialize from "../../lib/firebase";

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<{ message: string }>
) {
	return new Promise(async (resolve, reject) => {
		initialize();
		const db = admin.database();

		const id = uuid();

		const ref = db.ref(`connections/${id}`);
		await ref.set(Date.now());

		res.status(200).send({ message: id });
	});
}
