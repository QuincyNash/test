import { useState } from "react";

interface RunButtonProps {
	onRun: () => Promise<void>;
	onStop: () => Promise<void>;
	running: "yes" | "no" | "starting";
}

export default function RunButton(props: RunButtonProps) {
	let displayMap = {
		yes: "Stop",
		no: "Run",
		starting: "Starting",
	};

	return (
		<button
			className="w-32 h-12 p-2 bg-gray-300 rounded-md"
			onClick={async () => {
				if (props.running === "yes") {
					await props.onStop();
				} else if (props.running === "no") {
					await props.onRun();
				}
			}}
		>
			{displayMap[props.running]}
		</button>
	);
}
