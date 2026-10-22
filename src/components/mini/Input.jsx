export default function Input(type, label) {
  return (
    <div>
      <label htmlFor="search">{label}</label>
      <input type={type} name="input" id="input" />
    </div>
  )
}
