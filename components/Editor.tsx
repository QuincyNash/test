import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { githubLight } from "@uiw/codemirror-theme-github";
import { langs } from "@uiw/codemirror-extensions-langs";

interface EditorProps {
	default: string;
	onChange: (value: string) => void;
}

export default function Editor(props: EditorProps) {
	return (
		<div className="grow-0 shrink w-1/2 h-full overflow-auto bg-white rounded-md">
			<CodeMirror
				value={props.default}
				height={"100%"}
				theme={githubLight}
				extensions={[langs.python()]}
				onChange={props.onChange}
				onContextMenu={(e) => e.preventDefault()}
			></CodeMirror>
		</div>
	);
}
