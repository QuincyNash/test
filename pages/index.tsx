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

						try {
							const json = await res.json();
							elem.innerText = json.message;
							console.log(json.message);
						} catch {}
					}}
				>
					<textarea id="code" name="code" placeholder="Code"></textarea>
					<button type="submit">Submit</button>
				</form>
				<p id="output"></p>
			</div>
		</>
	);
}
