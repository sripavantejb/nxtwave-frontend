import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaChartBar, FaArrowRight, FaGraduationCap, FaLightbulb, FaChartLine, FaTrophy, FaBook } from 'react-icons/fa'
import { BsCurrencyDollar } from 'react-icons/bs'
import { fetchTopics } from '../api/client'
import type { Topic } from '../api/client'
import Loader from '../components/Loader'

// Icon mapping for topics
const topicIconMap: Record<string, React.ComponentType> = {
  'profit-loss': FaChartBar,
  'si-ci': BsCurrencyDollar,
  'si': BsCurrencyDollar,
  'ci': BsCurrencyDollar,
}

// Default icon fallback
const DefaultIcon = FaBook

// Safe icon renderer component
function SafeIcon({ icon, topicId }: { icon?: React.ComponentType, topicId: string }) {
  const IconComponent = icon || topicIconMap[topicId] || DefaultIcon
  if (!IconComponent || typeof IconComponent !== 'function') {
    return <DefaultIcon />
  }
  return <IconComponent />
}

export default function Home() {
  const [topics, setTopics] = useState<(Topic & { icon?: React.ComponentType })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTopics()
      .then((fetchedTopics) => {
        if (fetchedTopics && Array.isArray(fetchedTopics) && fetchedTopics.length > 0) {
          setTopics(fetchedTopics)
        } else {
          setTopics([])
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching topics:', err)
        setError(err.message || 'Failed to load topics')
        setLoading(false)
        // Set empty array on error to show fallback message
        setTopics([])
      })
  }, [])

  return (
    <div style={{ paddingBottom: 48 }}>
      <div id="home" className="hero">
        <h1>Choose a Concept to Begin</h1>
        <p>Rate yourself and take a 6-question adaptive quiz.</p>
      </div>

      {/* Conceptual Learning Path Section */}
      <section id="learn-concepts" style={{ marginTop: 48, marginBottom: 48, scrollMarginTop: '90px' }}>
        <Link to="/conceptual-guidelines" style={{ textDecoration: 'none', display: 'block' }}>
          <div 
            className="featured-card"
            style={{ 
              background: 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)',
              color: 'white',
              padding: '48px 40px',
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(153, 27, 27, 0.25)',
              border: 'none',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.01)'
              e.currentTarget.style.boxShadow = '0 30px 80px rgba(153, 27, 27, 0.35)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(153, 27, 27, 0.25)'
            }}>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-80px',
              left: '-80px',
              width: '250px',
              height: '250px',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }} />
            
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ 
                fontSize: '64px', 
                marginBottom: '20px',
                display: 'inline-block',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)'
              }}>
                <FaGraduationCap />
              </div>
              <h2 style={{ 
                fontSize: '36px', 
                fontWeight: 800, 
                marginBottom: '16px', 
                color: 'white',
                letterSpacing: '-0.02em'
              }}>
                Conceptual Learning Path
              </h2>
              <p style={{ 
                fontSize: '18px', 
                marginBottom: '32px', 
                opacity: 0.95, 
                lineHeight: 1.7,
                maxWidth: '700px',
                margin: '0 auto 32px'
              }}>
                Follow a structured journey through key concepts. Each concept is followed by a practice question tailored to your rating!
              </p>
              <div className="btn btn-white" style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '16px',
                fontWeight: 700,
                padding: '16px 32px'
              }}>
                Start Learning Journey <FaArrowRight />
              </div>
            </div>
          </div>
        </Link>
      </section>
      
      {/* Topics Section Header */}
      <section id="topics" style={{ scrollMarginTop: '90px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            marginBottom: '12px',
            color: 'var(--text)'
          }}>
            Available Topics
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '16px' }}>
            Choose a topic and test your knowledge with adaptive quizzes
          </p>
        </div>

        <div className="grid" style={{ marginTop: 32 }}>
        {loading ? (
          <div className="col-12" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '40px' }}>
            <Loader />
          </div>
        ) : error ? (
          <div className="col-12" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--accent)', fontSize: '16px', marginBottom: '12px' }}>Error loading topics</p>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>{error}</p>
          </div>
        ) : topics && topics.length > 0 ? topics.map((topic) => {
          if (!topic || !topic.id) return null
          return (
            <div key={topic.id} className="col-6">
              <Link to={`/rate/${topic.id}`} style={{ textDecoration: 'none', width: '100%', display: 'flex' }}>
                <div className="card card-accent">
                  <div className="topic-icon">
                    <SafeIcon icon={topic.icon} topicId={topic.id} />
                  </div>
                  <h2 className="card-title">{topic.name || 'Untitled Topic'}</h2>
                  <p className="muted" style={{ 
                    marginBottom: 20, 
                    lineHeight: 1.7, 
                    flexGrow: 1,
                    fontSize: '15px'
                  }}>
                    {topic.description || 'No description available.'}
                  </p>
                  <div className="btn" style={{ alignSelf: 'flex-start' }}>
                    Start Quiz <FaArrowRight style={{ marginLeft: 8, fontSize: '14px' }} />
                  </div>
                </div>
              </Link>
            </div>
          )
        }) : (
          <div className="col-12" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '16px' }}>No topics available at the moment.</p>
          </div>
        )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" style={{ 
        marginTop: 80, 
        marginBottom: 60,
        scrollMarginTop: '90px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ 
            fontSize: '36px', 
            fontWeight: 700, 
            marginBottom: '16px',
            color: 'var(--text)',
            letterSpacing: '-0.02em'
          }}>
            About NxtQuiz
          </h2>
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '18px',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Empowering learners with adaptive, intelligent quizzes designed to accelerate your mathematical journey.
          </p>
        </div>

        <div className="grid" style={{ gap: 32, marginBottom: 40 }}>
          <div className="col-4">
            <div style={{
              textAlign: 'center',
              padding: '32px 24px',
              background: 'var(--white)',
              borderRadius: '16px',
              boxShadow: 'var(--card-shadow)',
              border: '1px solid rgba(153,27,27,0.08)',
              transition: 'var(--transition)',
              height: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow)'
            }}>
              <div style={{
                fontSize: '48px',
                color: 'var(--accent)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FaLightbulb />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--text)'
              }}>
                Adaptive Learning
              </h3>
              <p style={{
                color: 'var(--muted)',
                fontSize: '15px',
                lineHeight: 1.6
              }}>
                Questions adapt to your skill level, ensuring you're always challenged at the right difficulty.
              </p>
            </div>
          </div>

          <div className="col-4">
            <div style={{
              textAlign: 'center',
              padding: '32px 24px',
              background: 'var(--white)',
              borderRadius: '16px',
              boxShadow: 'var(--card-shadow)',
              border: '1px solid rgba(153,27,27,0.08)',
              transition: 'var(--transition)',
              height: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow)'
            }}>
              <div style={{
                fontSize: '48px',
                color: 'var(--accent)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FaChartLine />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--text)'
              }}>
                Track Progress
              </h3>
              <p style={{
                color: 'var(--muted)',
                fontSize: '15px',
                lineHeight: 1.6
              }}>
                Monitor your performance and improvement over time with detailed analytics and insights.
              </p>
            </div>
          </div>

          <div className="col-4">
            <div style={{
              textAlign: 'center',
              padding: '32px 24px',
              background: 'var(--white)',
              borderRadius: '16px',
              boxShadow: 'var(--card-shadow)',
              border: '1px solid rgba(153,27,27,0.08)',
              transition: 'var(--transition)',
              height: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow)'
            }}>
              <div style={{
                fontSize: '48px',
                color: 'var(--accent)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FaTrophy />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--text)'
              }}>
                Master Concepts
              </h3>
              <p style={{
                color: 'var(--muted)',
                fontSize: '15px',
                lineHeight: 1.6
              }}>
                Build strong foundations in mathematics through carefully curated problems and explanations.
              </p>
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(153,27,27,0.05) 0%, rgba(185,28,28,0.03) 100%)',
          padding: '40px',
          borderRadius: '16px',
          border: '1px solid rgba(153,27,27,0.1)'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '16px',
            color: 'var(--text)',
            textAlign: 'center'
          }}>
            Why Choose NxtQuiz?
          </h3>
          <p style={{
            color: 'var(--text-light)',
            fontSize: '16px',
            lineHeight: 1.8,
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            NxtQuiz combines cutting-edge adaptive learning algorithms with expertly crafted content to create 
            a personalized learning experience. Whether you're a beginner or looking to sharpen your skills, 
            our platform adjusts to your level and helps you progress at your own pace. Start your journey 
            today and discover a smarter way to learn mathematics.
          </p>
        </div>
      </section>
    </div>
  )
}


