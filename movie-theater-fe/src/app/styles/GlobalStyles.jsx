export const GlobalStyles = () => {
  return (
    <style>{`
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: var(--nf-body-bg);
        background-attachment: fixed;
        color: var(--nf-text);
        overflow-x: hidden;
      }

      /* Scrollbar styling — transparent track (no dark right gutter) */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        background: var(--nf-scrollbar);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: var(--nf-scrollbar-hover);
      }

      /* Selection styling */
      ::selection {
        background-color: rgba(220, 38, 38, 0.3);
        color: var(--nf-selection-fg);
      }

      /* Animation utilities */
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Input placeholder styling */
      input::placeholder {
        color: var(--nf-text-dim);
      }

      input::-webkit-outer-spin-button,
      input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      input[type=number] {
        -moz-appearance: textfield;
      }

      html[data-theme='light'] input[type="date"]::-webkit-calendar-picker-indicator,
      html[data-theme='light'] input[type="datetime-local"]::-webkit-calendar-picker-indicator,
      html[data-theme='light'] input[type="time"]::-webkit-calendar-picker-indicator {
        filter: none;
      }
    `}</style>
  );
};
