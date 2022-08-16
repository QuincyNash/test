import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { spawn } from "child_process";
import { writeFileSync } from "fs";
import tmp from "tmp";

exports.handler = async (event: APIGatewayProxyEvent) => {
	return new Promise(async (resolve, reject) => {
		resolve({
			statusCode: 200,
			body: "Hello",
		})

		// const code = event.body;

		// if (!code) {
		// 	return resolve(JSON.stringify({
		// 		statusCode: 400,
		// 		body: "Invalid Request",
		// 	}))
		// }

		// const file = tmp.fileSync({ postfix: ".py" })

		// writeFileSync(file.name, code)

		// const process = spawn("./lambda/python3", [file.name])

		// process.stdout.on("data", (data) => {
		// 	return resolve(JSON.stringify({
		// 		statusCode: 200,
		// 		body: data.toString(),
		// 	}))
		// })
	})
};
