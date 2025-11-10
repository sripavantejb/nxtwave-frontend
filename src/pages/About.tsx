import { Link } from 'react-router-dom'
import { FaChartBar, FaClock, FaShieldAlt, FaGraduationCap, FaLightbulb } from 'react-icons/fa'
import { BsCurrencyDollar } from 'react-icons/bs'

export default function About() {
  const features = [
    {
      icon: FaGraduationCap,
      title: 'Adaptive Learning',
      description: 'Rate your knowledge level and get questions tailored to your understanding. The quiz adapts based on your self-assessment.'
    },
    {
      icon: FaClock,
      title: 'Time Management',
      description: 'Each question has a 60-second timer to help you practice time management skills essential for real exams.'
    },
    {
      icon: FaShieldAlt,
      title: 'Secure Environment',
      description: 'Fullscreen mode and tab-switch detection ensure a focused, distraction-free quiz experience.'
    },
    {
      icon: FaLightbulb,
      title: 'Instant Feedback',
      description: 'Get detailed explanations and results immediately after completing your quiz to understand your mistakes.'
    }
  ]

  const topics = [
    {
      id: 'profit-loss',
      name: 'Profit and Loss',
      description: 'Master calculations involving Cost Price (CP), Selling Price (SP), Profit, Loss, and percentages.',
      icon: FaChartBar
    },
    {
      id: 'si-ci',
      name: 'Simple Interest & Compound Interest',
      description: 'Learn and practice Simple Interest and Compound Interest calculations with real-world applications.',
      icon: BsCurrencyDollar
    }
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div className="card card-accent" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, marginBottom: 16, color: 'var(--accent)', textAlign: 'center' }}>
          About NxtQuiz
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.8, color: '#555', textAlign: 'center', marginBottom: 24 }}>
          Master mathematical concepts through adaptive quizzes designed to test your knowledge and improve your skills.
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, marginBottom: 16, color: 'var(--accent)' }}>
          What is NxtQuiz?
        </h2>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#555', marginBottom: 16 }}>
            NxtQuiz is an innovative online quiz platform designed to help students and professionals master 
            mathematical concepts through adaptive learning. Our platform provides a structured approach to 
            learning by allowing you to self-assess your knowledge level and then presenting questions 
            tailored to your understanding.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#555' }}>
            Whether you're preparing for competitive exams, brushing up on fundamentals, or simply want to 
            test your knowledge, NxtQuiz offers a comprehensive and engaging learning experience.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, marginBottom: 20, color: 'var(--accent)', textAlign: 'center' }}>
          Key Features
        </h2>
        <div className="grid" style={{ gap: 20 }}>
          {features.map((feature, idx) => {
            const IconComponent = feature.icon
            return (
              <div key={idx} className="col-6">
                <div className="card" style={{ padding: 24, height: '100%' }}>
                  <div style={{ 
                    fontSize: 32, 
                    color: 'var(--accent)', 
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconComponent />
                  </div>
                  <h3 style={{ fontSize: 18, marginBottom: 12, color: 'var(--accent)', textAlign: 'center' }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: '#666', textAlign: 'center' }}>
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, marginBottom: 20, color: 'var(--accent)', textAlign: 'center' }}>
          Available Topics
        </h2>
        <div className="grid" style={{ gap: 20 }}>
          {topics.map((topic) => {
            const IconComponent = topic.icon
            return (
              <div key={topic.id} className="col-6">
                <Link to={`/rate/${topic.id}`} style={{ textDecoration: 'none', width: '100%', display: 'flex' }}>
                  <div className="card card-accent" style={{ padding: 24, height: '100%', cursor: 'pointer', transition: 'transform 0.2s' }}>
                    <div style={{ 
                      fontSize: 32, 
                      color: 'var(--accent)', 
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconComponent />
                    </div>
                    <h3 style={{ fontSize: 18, marginBottom: 12, color: 'var(--accent)', textAlign: 'center' }}>
                      {topic.name}
                    </h3>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: '#666', textAlign: 'center' }}>
                      {topic.description}
                    </p>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, marginBottom: 16, color: 'var(--accent)' }}>
          How It Works
        </h2>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ 
                minWidth: 32, 
                height: 32, 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent)', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 16
              }}>
                1
              </div>
              <div>
                <h4 style={{ fontSize: 18, marginBottom: 8, color: 'var(--accent)' }}>
                  Choose a Topic
                </h4>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: '#555' }}>
                  Select from our available mathematical topics. Each topic covers essential concepts with 
                  comprehensive explanations and hints.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ 
                minWidth: 32, 
                height: 32, 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent)', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 16
              }}>
                2
              </div>
              <div>
                <h4 style={{ fontSize: 18, marginBottom: 8, color: 'var(--accent)' }}>
                  Rate Your Knowledge
                </h4>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: '#555' }}>
                  Self-assess your knowledge level on a scale of 1 to 5. This helps our system adapt the 
                  difficulty of questions to match your understanding.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ 
                minWidth: 32, 
                height: 32, 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent)', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 16
              }}>
                3
              </div>
              <div>
                <h4 style={{ fontSize: 18, marginBottom: 8, color: 'var(--accent)' }}>
                  Review Guidelines
                </h4>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: '#555' }}>
                  Read through the quiz guidelines and rules. Understanding the format and restrictions 
                  will help you perform better.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ 
                minWidth: 32, 
                height: 32, 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent)', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 16
              }}>
                4
              </div>
              <div>
                <h4 style={{ fontSize: 18, marginBottom: 8, color: 'var(--accent)' }}>
                  Take the Quiz
                </h4>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: '#555' }}>
                  Answer 6 questions with a 60-second time limit per question. The quiz automatically 
                  enters fullscreen mode for a focused experience.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ 
                minWidth: 32, 
                height: 32, 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent)', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 16
              }}>
                5
              </div>
              <div>
                <h4 style={{ fontSize: 18, marginBottom: 8, color: 'var(--accent)' }}>
                  View Results
                </h4>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: '#555' }}>
                  Get instant feedback with detailed explanations for each question. Review your mistakes 
                  and learn from them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, marginBottom: 16, color: 'var(--accent)' }}>
          Quiz Rules & Guidelines
        </h2>
        <div className="card" style={{ padding: 24 }}>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.8, color: '#555' }}>
            <li style={{ marginBottom: 12 }}>
              <strong>Time Limit:</strong> Each question has a 60-second time limit. If time runs out, 
              your current answer (if any) will be automatically submitted.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong>No Going Back:</strong> Once you submit or skip a question, you cannot return to 
              previous questions.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong>Tab Switching:</strong> Switching tabs or minimizing the browser will result in 
              warnings. Multiple violations will terminate your quiz.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong>Fullscreen Mode:</strong> The quiz automatically enters fullscreen mode to minimize 
              distractions and ensure a focused environment.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong>Progress Saving:</strong> Your quiz progress is automatically saved. If you 
              accidentally close the browser, you can resume from where you left off.
            </li>
          </ul>
        </div>
      </div>

      <div className="card card-accent" style={{ padding: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, marginBottom: 16, color: 'var(--accent)' }}>
          Ready to Get Started?
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: '#555', marginBottom: 24 }}>
          Choose a topic, rate your knowledge, and start your learning journey with NxtQuiz today!
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 32px' }}>
          Explore Topics
        </Link>
      </div>
    </div>
  )
}

