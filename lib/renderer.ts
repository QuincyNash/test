import p5Types from "p5";
import { Socket } from "socket.io-client";
import { Object, Scene } from "../pages/index";

interface Vector {
	x: number;
	y: number;
}

const GRID_SIZE = 50; // Pixels

// Converts custom coordinates to pixel coordinates
export function screenCoors(p5: p5Types, x: number, y: number): Vector {
	return {
		x: p5.width / 2 + GRID_SIZE * x,
		y: p5.height / 2 - GRID_SIZE * y,
	};
}

// Converts pixel coordinates to custom coordinates
export function virtualCoors(p5: p5Types, x: number, y: number): Vector {
	return {
		x: (x - p5.width / 2) / GRID_SIZE,
		y: -(y - p5.height / 2) / GRID_SIZE,
	};
}

export function sendEvent(
	p5: p5Types,
	socket: Socket | null,
	name:
		| "rightclick"
		| "doubleclick"
		| "mousedrag"
		| "mousemove"
		| "mousedown"
		| "mouseup"
		| "keydown"
		| "keyup",
	event: any
) {
	// Trigger mouse events only within canvas
	if (
		[
			"rightclick",
			"mousedown",
			"mouseup",
			"mousemove",
			"mousedrag",
			"doubleclick",
		].includes(name)
	) {
		if (
			0 <= p5.mouseX &&
			p5.mouseX < p5.width &&
			0 <= p5.mouseY &&
			p5.mouseY < p5.height
		) {
			const pos = virtualCoors(p5, p5.mouseX, p5.mouseY);
			socket?.emit(name, { x: pos.x, y: pos.y });
		}
	} else {
		// Trigger keyboard events if code editor is not selected
		if (event.target.role !== "textbox") {
			socket?.emit(name, {
				key: event.key,
				keyCode: event.code,
				shift: event.shiftKey,
				alt: event.altKey,
				ctrl: event.ctrlKey,
				meta: event.metaKey,
			});
		}
	}
}

export function render(p5: p5Types, scene: Scene, object: Object) {
	if (object.border.r === undefined) {
		p5.noStroke();
	} else {
		p5.stroke(object.border.r, object.border.g, object.border.b);
		p5.strokeWeight(object.borderThickness);
	}
	p5.fill(object.color.r, object.color.g, object.color.b);
	p5.beginShape();
	for (let point of object.points) {
		const xpos = object.fixed ? point.x : point.x - scene.camera.x;
		const ypos = object.fixed ? point.y : point.y - scene.camera.y;

		const coors = screenCoors(p5, xpos, ypos);
		p5.vertex(coors.x, coors.y);
	}
	p5.endShape(p5.CLOSE);
}
