import RunButton from "./RunButton";

interface HeaderProps {
	onRun: () => Promise<void>;
	onStop: () => Promise<void>;
	running: "yes" | "no" | "starting";
}

export default function Header(props: HeaderProps) {
	return (
		<div className="bg-slate-400 shrink-0 flex items-center justify-center w-full h-16">
			<RunButton
				onRun={props.onRun}
				onStop={props.onStop}
				running={props.running}
			></RunButton>
		</div>
	);
}
