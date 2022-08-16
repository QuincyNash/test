const path = require("path");

module.exports = {
	target: "node",
	mode: "production",
	entry: "./run.js",
	output: {
		libraryTarget: "commonjs",
		filename: "./index.js",
		path: __dirname,
	},
	resolve: {
		
		extensions: [".ts", ".js"],
		modules: [path.resolve(__dirname, "..", "node_modules")],
	},
};
