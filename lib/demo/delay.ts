/** Short pause so demo AI responses feel generated rather than instant. */
export function demoDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
