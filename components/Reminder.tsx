import { useState } from "react"
import { addPropertyControls, ControlType } from "framer"

export default function EmailReminderForm(props) {
    const [email, setEmail] = useState("")
    const [status, setStatus] = useState("idle")

    const handleSubmit = async (e) => {
        e.preventDefault()

        const trimmedEmail = email.trim()

        // Erro 2 – Campo vazio
        if (trimmedEmail === "") {
            setStatus("error-empty")
            return
        }

        // Erro 1 – E-mail com formato inválido
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
        if (!isValidEmail) {
            setStatus("error-invalid")
            return
        }

        setStatus("loading")

        try {
            const response = await fetch(
                "https://email-endpoint-eight.vercel.app/api/send-email",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        to_email: trimmedEmail,
                        message: props.message,
                        link: props.link,
                        linkLabel: props.linkLabel,
                        signature: props.signature,
                    }),
                }
            )

            if (response.ok) {
                setStatus("success")
            } else {
                setStatus("error-backend")
            }
        } catch (error) {
            setStatus("error-backend")
        }
    }
    return (
        <div style={{ fontFamily: props.font, padding: 16 }}>
            {status === "success" ? (
                <p
                    style={{
                        fontSize: props.feedbackFontSize,
                        color: props.successColor,
                        fontFamily: props.font,
                    }}
                >
                    {props.successMessage}
                </p>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    noValidate
                    style={{
                        display: "flex", // Mudamos de grid para flex
                        alignItems: "flex-start", // Alinha pelo topo (para o texto não deslocar o botão)
                        gap: 16,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            width: 400, // largura fixa para o input
                            flexShrink: 0, // impede que encolha
                        }}
                    >
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                if (status !== "idle") setStatus("idle")
                            }}
                            placeholder={props.placeholder}
                            aria-label="Campo de e-mail"
                            aria-describedby={
                                [
                                    "error-empty",
                                    "error-invalid",
                                    "error-backend",
                                ].includes(status)
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
                                    [
                                        "error-empty",
                                        "error-invalid",
                                        "error-backend",
                                    ].includes(status)
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

                        {[
                            "error-empty",
                            "error-invalid",
                            "error-backend",
                        ].includes(status) && (
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
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={status === "loading"}
                        style={{
                            background: props.buttonColor,
                            color: "#FFFFFF",
                            fontFamily: "Manrope, sans-serif",
                            fontSize: 18,
                            fontWeight: 700,
                            border: "none",
                            borderRadius: props.buttonRadius,
                            padding: "8px 16px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            minWidth: 180,
                        }}
                    >
                        {status === "loading"
                            ? props.loadingText
                            : props.buttonText}
                    </button>
                </form>
            )}
        </div>
    )
}

addPropertyControls(EmailReminderForm, {
    placeholder: { type: ControlType.String, title: "Placeholder" },
    buttonText: { type: ControlType.String, title: "Texto do botão" },
    loadingText: { type: ControlType.String, title: "Texto carregando" },
    successMessage: { type: ControlType.String, title: "Mensagem de sucesso" },
    errorMessage: { type: ControlType.String, title: "Mensagem de erro" },
    message: { type: ControlType.String, title: "Mensagem do e-mail" },
    signature: { type: ControlType.String, title: "Assinatura do e-mail" },
    link: { type: ControlType.String, title: "Link do CV" },
    linkLabel: { type: ControlType.String, title: "Texto do link do CV" },
    font: { type: ControlType.String, title: "Fonte dos textos de feedback" },
    fontSize: { type: ControlType.Number, title: "Tamanho da fonte do input" },
    feedbackFontSize: {
        type: ControlType.Number,
        title: "Tamanho do texto de feedback",
    },
    inputBgColor: { type: ControlType.Color, title: "Cor de fundo do campo" },
    inputRadius: { type: ControlType.Number, title: "Raio da borda do campo" },
    inputStrokeColor: {
        type: ControlType.Color,
        title: "Cor da borda do campo",
    },
    inputStrokeWidth: {
        type: ControlType.Number,
        title: "Espessura da borda do campo",
    },
    buttonColor: { type: ControlType.Color, title: "Cor do botão" },
    buttonRadius: { type: ControlType.Number, title: "Raio da borda do botão" },
    errorColor: { type: ControlType.Color, title: "Cor do texto de erro" },
    successColor: { type: ControlType.Color, title: "Cor do texto de sucesso" },
    errorInvalidEmail: {
        type: ControlType.String,
        title: "Erro: e-mail inválido",
        defaultValue: "Digite um e-mail válido.",
    },
    errorEmptyEmail: {
        type: ControlType.String,
        title: "Erro: campo vazio",
        defaultValue: "O campo de e-mail não pode estar vazio.",
    },
    errorBackend: {
        type: ControlType.String,
        title: "Erro técnico",
        defaultValue: "Erro ao enviar. Tente novamente mais tarde.",
    },
})
