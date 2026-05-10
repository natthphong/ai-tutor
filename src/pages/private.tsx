import React from 'react';

export default function Page() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
            <main className="rounded-2xl bg-white p-12 shadow-xl">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                    Hello, World!
                </h1>
                <p className="mt-4 text-center text-lg text-gray-600">
                    Your Next.js journey starts right here.
                </p>
                <div className="mt-8 flex justify-center">
                    <button
                        className="rounded-full bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition-colors"
                        onClick={() => console.log('Hello back!')}
                    >
                        Say Hello
                    </button>
                </div>
            </main>
        </div>
    );
}