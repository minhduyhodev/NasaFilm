import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Gem, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import heroBg from '../../../shared/assets/about_hero_bg.png';
import projectorImg from '../../../shared/assets/about_projector.png';
import julianAvatar from '../../../shared/assets/avatar_julian.png';
import elenaAvatar from '../../../shared/assets/avatar_elena.png';
import marcusAvatar from '../../../shared/assets/avatar_marcus.png';
import sashaAvatar from '../../../shared/assets/avatar_sasha.png';
import './AboutPage.css';

const AboutPage = () => {
  // Animation variants for staggered load
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  return (
    <div className="about-page-wrapper">
      <Navbar />

      {/* Hero Section */}
      <section 
        className="about-hero"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="about-hero-overlay" />
        <motion.div 
          className="about-hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="about-hero-title">
            Elevating the Art of Experience
          </h1>
          <p className="about-hero-sub">
            Where every frame is a masterpiece and every seat is the best in the house.
          </p>
        </motion.div>
      </section>

      {/* Our Story Section */}
      <motion.section 
        className="about-story-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={containerVariants}
      >
        <motion.div className="about-story-content" variants={itemVariants}>
          <h2 className="about-story-title">Our Story</h2>
          <p className="about-story-text">
            Founded in 2012, CINE LUXE began with a simple vision: to return the magic to the silver screen. In an era of digital convenience, we believed that the physical act of watching a film should be a sacred, immersive ritual.
          </p>
          <p className="about-story-text">
            We spent a decade refining the technology and architecture of our spaces, blending cutting-edge laser projection with mid-century theatrical luxury. Today, we stand as a global benchmark for premium cinema, hosting world premieres and fostering a community of true film enthusiasts.
          </p>
        </motion.div>
        
        <motion.div 
          className="about-story-image-container"
          variants={itemVariants}
        >
          <img 
            src={projectorImg} 
            alt="Premium Vintage Movie Projector" 
            className="about-story-image" 
          />
        </motion.div>
      </motion.section>

      {/* The Core Values Section */}
      <section className="about-values-section">
        <h2 className="about-values-title">The Core Values</h2>
        
        <motion.div 
          className="about-values-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {/* Card 1: Innovation */}
          <motion.div className="about-value-card" variants={itemVariants}>
            <div className="about-value-icon-wrapper">
              <Zap size={22} />
            </div>
            <h3 className="about-value-title">Innovation</h3>
            <p className="about-value-description">
              Pushing the boundaries of sight and sound with proprietary 8K laser technology and Dolby Atmos immersive audio.
            </p>
          </motion.div>

          {/* Card 2: Luxury */}
          <motion.div className="about-value-card" variants={itemVariants}>
            <div className="about-value-icon-wrapper">
              <Gem size={22} />
            </div>
            <h3 className="about-value-title">Luxury</h3>
            <p className="about-value-description">
              Hand-stitched leather recliners, personal butler service, and curated menus from Michelin-starred partners.
            </p>
          </motion.div>

          {/* Card 3: Community */}
          <motion.div className="about-value-card" variants={itemVariants}>
            <div className="about-value-icon-wrapper">
              <Users size={22} />
            </div>
            <h3 className="about-value-title">Community</h3>
            <p className="about-value-description">
              Fostering a space for film lovers to gather, share, and celebrate the transformative power of storytelling.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* The Visionaries Section */}
      <section className="about-visionaries-section">
        <h2 className="about-visionaries-title">The Visionaries</h2>
        <p className="about-visionaries-sub">
          The minds behind the magic, dedicated to perfecting your cinematic journey.
        </p>

        <motion.div 
          className="about-visionaries-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {/* Visionary 1: Julian Vance */}
          <motion.div className="about-visionary-card" variants={itemVariants}>
            <div className="about-visionary-avatar-wrapper">
              <img 
                src={julianAvatar} 
                alt="Julian Vance" 
                className="about-visionary-avatar" 
              />
            </div>
            <h3 className="about-visionary-name">Julian Vance</h3>
            <p className="about-visionary-role">CEO & Founder</p>
          </motion.div>

          {/* Visionary 2: Elena Rossi */}
          <motion.div className="about-visionary-card" variants={itemVariants}>
            <div className="about-visionary-avatar-wrapper">
              <img 
                src={elenaAvatar} 
                alt="Elena Rossi" 
                className="about-visionary-avatar" 
              />
            </div>
            <h3 className="about-visionary-name">Elena Rossi</h3>
            <p className="about-visionary-role">Experience Director</p>
          </motion.div>

          {/* Visionary 3: Marcus Chen */}
          <motion.div className="about-visionary-card" variants={itemVariants}>
            <div className="about-visionary-avatar-wrapper">
              <img 
                src={marcusAvatar} 
                alt="Marcus Chen" 
                className="about-visionary-avatar" 
              />
            </div>
            <h3 className="about-visionary-name">Marcus Chen</h3>
            <p className="about-visionary-role">CTO</p>
          </motion.div>

          {/* Visionary 4: Sasha de Noir */}
          <motion.div className="about-visionary-card" variants={itemVariants}>
            <div className="about-visionary-avatar-wrapper">
              <img 
                src={sashaAvatar} 
                alt="Sasha de Noir" 
                className="about-visionary-avatar" 
              />
            </div>
            <h3 className="about-visionary-name">Sasha de Noir</h3>
            <p className="about-visionary-role">Creative Lead</p>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="about-cta-section">
        <motion.div 
          className="about-cta-card"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="about-cta-title">Love Film? Let's Work Together.</h2>
          <p className="about-cta-sub">
            We are always looking for passionate individuals who believe in the power of the cinematic experience. Join our growing team in London, Paris, and Tokyo.
          </p>
          <div className="about-cta-buttons">
            <button className="about-btn-primary">
              View Careers
            </button>
            <button className="about-btn-secondary">
              Contact HR
            </button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
