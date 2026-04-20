"use client";

import Error from "next/error";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <Error statusCode={500} title="Unexpected Error" />
            </body>
        </html>
    );
}
