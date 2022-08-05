import Script from "next/script";

export default function Home() {
	return (
		<>
			<div>
				<form
					onClick={async (e) => {
						e.preventDefault();

						let res = await fetch("api/run", {
							method: "POST",
							body: (document.querySelector("#code") as HTMLInputElement).value,
						});
						let elem = document.querySelector(
							"#output"
						) as HTMLParagraphElement;

						elem.innerText = (await res.json()).message;
					}}
				>
					<input id="code" name="code" placeholder="Code"></input>
					<button type="submit">Submit</button>
				</form>
				<p id="output"></p>
			</div>
		</>
	);
}
