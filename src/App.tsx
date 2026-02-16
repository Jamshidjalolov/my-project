import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Courses from './components/Courses';
import CourseDetail from './components/CourseDetail';
import Success from './components/Success';
import Features from './components/Features';
import WhatIs from './components/WhatIs';
import Everything from './components/Everything';
import FeatureClassroom from './components/FeatureClassroom';
import ToolsTeachers from './components/ToolsTeachers';
import Assessments from './components/Assessments';
import ClassManagement from './components/ClassManagement';
import OneOnOne from './components/OneOnOne';
import ExploreCourse from './components/ExploreCourse';
import QuisqueCourse from './components/QuisqueCourse';
import AeneanFacilisis from './components/AeneanFacilisis';
import Testimonial from './components/Testimonial';
import LatestNews from './components/LatestNews';
import NewsletterFooter from './components/NewsletterFooter';


function App() {
  return (
    <div>
        <Router>
                <Routes>
                    <Route path="/" element={<><Home /><Success /><Features /><WhatIs /><Everything /><FeatureClassroom /><ToolsTeachers /><Assessments /><ClassManagement /><OneOnOne />
                      <div className="bg-white">
                        <div className="mx-auto w-[1920px] max-w-full bg-[linear-gradient(90deg,#eaf4ff_0%,#eaf4ff_50%,#ffffff_50%,#ffffff_100%)]">
                          <ExploreCourse />
                          <QuisqueCourse />
                          <AeneanFacilisis />
                        </div>
                      </div>
                      <Testimonial /><LatestNews /><NewsletterFooter /></>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/courses/:courseId" element={<CourseDetail />} />
                </Routes>
        </Router>
     
        </div>
  )
}

export default App
