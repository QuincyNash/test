import dynamic from "next/dynamic";
import p5Types from "p5";
import { useEffect, useRef, useState } from "react";

export type Setup = (p5: p5Types) => void;
export type Draw = (p5: p5Types) => void;

export default function P5Sketch(props: { draw: Draw; setup: Setup }) {
	useEffect(() => {
		let instance: p5Types | null = null;

		(async () => {
			const p5 = (await import("p5")).default;

			if (props.setup !== undefined && props.draw !== undefined) {
				instance = new p5((instance: p5Types) => {
					instance.setup = () => props.setup(instance);
					instance.draw = () => props.draw(instance);
				}, document.querySelector("#canv") as HTMLElement);
			}
		})();

		return () => {
			instance?.remove();
		};
	}, [props]);
	return <div className="w-fit h-fit border border-black" id="canv"></div>;
}
