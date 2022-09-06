import { useState } from "react";

interface RunButtonProps {
	onRun: () => void;
	onStop: () => void;
	stoppable: boolean;
}

export default function RunButton(props: RunButtonProps) {
	const [running, setRunning] = useState(false);

	return (
		<button
			className="w-16 h-fit p-2 bg-gray-300 rounded-md"
			onClick={async () => {
				if (props.stoppable) {
					if (running) {
						await props.onStop();
					} else {
						await props.onRun();
					}
					setRunning(!running);
				}
			}}
		>
			{running ? "Stop" : "Run"}
		</button>
	);
}
