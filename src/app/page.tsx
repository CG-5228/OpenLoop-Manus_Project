export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-10">
      <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
        OpenLoop
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
        Your conversations are full of promises. OpenLoop makes sure they are not forgotten.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
        Shared application foundation is ready. The dashboard, import flow, AI extraction, and
        commitment actions will land through their feature branches.
      </p>
      <p className="mt-10 text-sm text-slate-500">
        Development status: foundation established — see the team workflow in docs.
      </p>
    </main>
  );
}
