import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
	return (
		<Html>
			<Head>
				<Script
					strategy="beforeInteractive"
					src="https://js.pusher.com/5.0/pusher.min.js"
				></Script>
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
