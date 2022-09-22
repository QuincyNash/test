import p5Types from "p5";
import React, { useEffect } from "react";

export type Sketch = (p5: p5Types) => void;

// Wrapper component for p5
function P5Sketch(props: { sketch: Sketch }) {
	useEffect(() => {
		let instance: p5Types | null = null;

		(async () => {
			// Dynamic import since p5 requires "window" and won't work with SSR
			const p5 = (await import("p5")).default;

			if (props.sketch) {
				instance = new p5((instance: p5Types) => {
					props.sketch(instance);
				}, document.querySelector("#canv") as HTMLElement);
			}
		})();

		return () => {
			instance?.remove();
		};
	});

	return (
		<div
			className="w-fit h-fit border border-black"
			id="canv"
			onContextMenu={(e) => e.preventDefault()}
		></div>
	);
}

// Only update sketch if props have changed to stop canvas from clearing unnecessarily
export default React.memo(P5Sketch);
