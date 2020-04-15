function copyText(text: string, callback: (err: null | any) => any) {
  navigator.clipboard.writeText(text).then(
    () => {
      callback(null)
    },
    (err) => {
      callback(err)
    }
  )
}
