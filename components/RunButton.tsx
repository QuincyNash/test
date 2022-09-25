import RunIcon from "@mui/icons-material/PlayArrowRounded";
import StopIcon from "@mui/icons-material/StopRounded";
import Progress from "@mui/material/CircularProgress";
import { useEffect, useState } from "react";

interface RunButtonProps {
	onRun: () => Promise<void>;
	onStop: () => Promise<void>;
	running: "yes" | "no" | "starting";
}

export default function RunButton(props: RunButtonProps) {
	const [startingText, setStartingText] = useState("Run");

	let displayMap = {
		yes: "Stop",
		no: "Run",
	};

	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (props.running === "starting") {
			interval = setTimeout(() => {
				setStartingText("Starting");
			}, 200);
		}

		return () => {
			setStartingText("Run");
			clearInterval(interval);
		};
	}, [props.running]);

	return (
		<button
			className="h-fit flex items-center justify-center w-24 py-2 bg-white rounded-md"
			onClick={async () => {
				if (props.running === "yes") {
					await props.onStop();
				} else if (props.running === "no") {
					await props.onRun();
				}
			}}
		>
			{props.running === "yes" ? (
				<StopIcon></StopIcon>
			) : props.running === "starting" && startingText === "Starting" ? (
				<div className="flex items-center justify-center ml-2">
					<Progress
						variant="indeterminate"
						sx={{
							color: "black",
							animationDuration: "750ms",
						}}
						size={"1rem"}
						thickness={4}
						disableShrink
					></Progress>
				</div>
			) : (
				<RunIcon></RunIcon>
			)}
			<span className="ml-1 mr-2">
				{props.running === "starting"
					? startingText
					: displayMap[props.running]}
			</span>
		</button>
	);
}
