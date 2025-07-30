// Versão com acessibilidade (aria-label e aria-describedby)

<input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder={props.placeholder}
    aria-label="Campo de e-mail"
    aria-describedby={
        ["error-empty", "error-invalid", "error-backend"].includes(status)
            ? "email-error"
            : undefined
    }
    style={{
        padding: "8px",
        fontSize: 18,
        fontFamily: "Manrope, sans-serif",
        fontWeight: 500,
        color: "#000",
        background: props.inputBgColor,
        borderRadius: props.inputRadius,
        border: `${props.inputStrokeWidth}px solid ${
            ["error-empty", "error-invalid", "error-backend"].includes(status)
                ? "#FF4D4F"
                : props.isFocused
                  ? "#F3663F"
                  : props.inputStrokeColor
        }`,
        width: "100%",
        outline: "none",
    }}
    onFocus={() => props.setIsFocused?.(true)}
    onBlur={() => props.setIsFocused?.(false)}
/>

{["error-empty", "error-invalid", "error-backend"].includes(status) && (
    <p
        id="email-error"
        style={{
            color: props.errorColor,
            fontSize: props.feedbackFontSize,
            fontFamily: props.font,
            marginTop: 4,
            lineHeight: 1.4,
            width: "100%",
            wordBreak: "break-word",
        }}
    >
        {status === "error-empty"
            ? props.errorEmptyEmail
            : status === "error-invalid"
              ? props.errorInvalidEmail
              : props.errorBackend}
    </p>
) }
