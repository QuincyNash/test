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
		<CodeMirror
			className="w-1/2"
			height={"320px"}
			value={props.default}
			theme={githubLight}
			extensions={[langs.python()]}
			onChange={props.onChange}
			onContextMenu={(e) => e.preventDefault()}
		></CodeMirror>
	);
}
