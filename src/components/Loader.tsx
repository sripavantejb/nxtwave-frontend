import './Loader.css'

interface LoaderProps {
  message?: string
}

export default function Loader({ message = 'Loading...' }: LoaderProps) {
  return (
    <div className="loader-container">
      <div className="loader-wrapper">
        <div className="loader-ring">
          <div className="loader-ring-inner"></div>
          <div className="loader-ring-inner"></div>
          <div className="loader-ring-inner"></div>
          <div className="loader-ring-inner"></div>
        </div>
        <div className="loader-logo">
          <img 
            src="https://res.cloudinary.com/dqataciy5/image/upload/v1762799447/Screenshot_2025-11-11_at_12.00.06_AM_xiuruw.png" 
            alt="NxtQuiz logo" 
            className="loader-logo-img"
          />
        </div>
      </div>
      {message && <p className="loader-message">{message}</p>}
    </div>
  )
}

