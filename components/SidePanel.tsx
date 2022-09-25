import FileIcon from "@mui/icons-material/InsertDriveFileRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";
import { useState } from "react";
import FilesPanel from "./FilesPanel";
import SettingsPanel from "./SettingsPanel";

type Panel = "files" | "settings";

interface ButtonProps {
	children: React.ReactNode;
	focused: boolean;
	title: string;
	onClick: () => void;
}

function Button(props: ButtonProps) {
	return (
		<Tooltip
			title={props.title}
			arrow
			placement="right"
			TransitionComponent={Zoom}
		>
			<button
				className={`hover:bg-blue-200 flex items-center justify-center w-10 h-10 transition-colors rounded-md ${
					props.focused ? "bg-blue-400" : ""
				}`}
				onClick={props.onClick}
			>
				{props.children}
			</button>
		</Tooltip>
	);
}

export default function SidePanel(props: {}) {
	const [focused, setFocused] = useState<Panel>("files");
	const [panelHidden, setPanelHidden] = useState(false);

	function handleClick(panel: Panel) {
		if (focused !== panel) {
			setFocused(panel);
			setPanelHidden(false);
		} else {
			setPanelHidden(!panelHidden);
		}
	}

	return (
		<div className="flex bg-white rounded-md">
			<div className="stroke-black flex flex-col h-full gap-1 p-1 text-3xl text-transparent">
				<Button
					title="Files"
					focused={focused === "files"}
					onClick={() => handleClick("files")}
				>
					<FileIcon fontSize="inherit"></FileIcon>
				</Button>
				<Button
					title="Settings"
					focused={focused === "settings"}
					onClick={() => handleClick("settings")}
				>
					<SettingsIcon fontSize="inherit"></SettingsIcon>
				</Button>
			</div>
			<div className="w-px h-full bg-black"></div>
			{panelHidden ? (
				""
			) : (
				<div className="w-40 h-full p-2">
					{focused === "files" ? (
						<FilesPanel></FilesPanel>
					) : (
						<SettingsPanel></SettingsPanel>
					)}
				</div>
			)}
		</div>
	);
}
