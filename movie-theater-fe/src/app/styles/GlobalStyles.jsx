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
        background: #0f0f0f;
        color: #ffffff;
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
        background: rgba(220, 38, 38, 0.45);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(220, 38, 38, 0.7);
      }

      /* Selection styling */
      ::selection {
        background-color: rgba(220, 38, 38, 0.3);
        color: #ffffff;
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
        color: rgba(107, 114, 128, 0.7);
      }

      input::-webkit-outer-spin-button,
      input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      input[type=number] {
        -moz-appearance: textfield;
      }
    `}</style>
  );
};
