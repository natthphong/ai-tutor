// src/pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html lang="th">
            <Head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
                <meta name="description" content="AI English Tutor for Thai learners - Listen, Speak, Read" />
                <meta name="theme-color" content="#0f0f23" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
