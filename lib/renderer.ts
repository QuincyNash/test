import p5Types from "p5";
import { Object } from "../pages/index";

interface Vector {
	x: number;
	y: number;
	z?: number;
}

function screenCoors(p5: p5Types, x: number, y: number): Vector {
	return {
		x: p5.width / 2 + 50 * x,
		y: p5.height / 2 - 50 * y,
	};
}

export function render(p5: p5Types, object: Object) {
	p5.noStroke();
	p5.fill(object.color.r, object.color.g, object.color.b);
	p5.beginShape();
	for (let point of object.points) {
		const coors = screenCoors(p5, point.x, point.y);
		p5.vertex(coors.x, coors.y);
	}
	p5.endShape(p5.CLOSE);
}
