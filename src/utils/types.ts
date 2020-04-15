// https://www.typescriptlang.org/docs/handbook/utility-types.html

// https://stackoverflow.com/a/49725198/4339170
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
	T,
	Exclude<keyof T, Keys>
> &
	{
		[K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
	}[Keys]

// DOM

// fileInput.addEventListener('change', (e) => {  const files = e.target.files })
interface HTMLInputElement {
	addEventListener(
		type: 'change',
		listener: (e: Event & { target: HTMLInputElement & EventTarget }) => any
	): void
}

// Get type of array items: myArray[number]
// Get type of class member: MyClass["myMember"]
// Get return type of function ReturnType<myFunction>
// Get parameter type of function Parameters<myFunction>