import { spawn } from "child_process";
import tmp from "tmp";

exports.handler = async (event: any) => {
	// TODO implement

	tmp.file((err, path, fd, cleanupCallback) => {
		if (err) throw err;

		console.log("File: ", path);
		console.log("Filedescriptor: ", fd);

		cleanupCallback();
	});

	const response = {
		statusCode: 200,
		body: JSON.stringify("Hello from Lambda!"),
	};
	return response;
};
