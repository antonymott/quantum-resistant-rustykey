/** Serialize async work (one flight at a time). */
export class AsyncMutex {
	private tail: Promise<void> = Promise.resolve();

	run<T>(fn: () => Promise<T> | T): Promise<T> {
		const run = this.tail.then(fn);
		this.tail = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	}
}
