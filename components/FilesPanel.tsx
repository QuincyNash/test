import AddFileIcon from "@mui/icons-material/NoteAddRounded";
import AddFolderIcon from "@mui/icons-material/CreateNewFolderRounded";
import DownloadIcon from "@mui/icons-material/FileDownloadRounded";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";
import React from "react";

interface ButtonProps {
	children: React.ReactNode;
	className?: string;
	onClick: () => void;
	title: string;
}

function Button(props: ButtonProps) {
	return (
		<Tooltip title={props.title} arrow TransitionComponent={Zoom}>
			<button
				className={`hover:bg-gray-200 flex items-center text-lg justify-center w-6 h-6 transition-colors rounded-md mr-0 ${props.className}`}
				onClick={props.onClick}
			>
				{props.children}
			</button>
		</Tooltip>
	);
}

export default function FilesPanel(props: {}) {
	return (
		<div>
			<div className="w-full h-full">
				<div className="flex">
					<h3 className="text-xl">Files</h3>
					<Button className="ml-auto" title="Create File" onClick={() => {}}>
						<AddFileIcon fontSize="inherit"></AddFileIcon>
					</Button>
					<Button title="Create Folder" onClick={() => {}}>
						<AddFolderIcon fontSize="inherit"></AddFolderIcon>
					</Button>
					<Button title="Download Zip" onClick={() => {}}>
						<DownloadIcon fontSize="inherit"></DownloadIcon>
					</Button>
				</div>
			</div>
			<div></div>
		</div>
	);
}
