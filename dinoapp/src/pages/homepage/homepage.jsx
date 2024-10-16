import React from 'react';
import { Link } from 'react-router-dom';
import './homepage.css';
import { assets } from '../../assets/assets';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';


const Homepage = () => {
  return (
    <Container className="justify-content-md-center">
    <Row className="justify-content-md-center">
      <Col className='text-center'>
          <p className="mt-3 mb-4 selectoption">Select an option</p>
          <Link to="/generate">
            <button className='GFSbtn'>
              Generate From AI
            </button>
          </Link>
          <br />
          <Link to="/schemaEditor">
            <button className='PSbtn'>
              Make Schema
            </button>
          </Link>
          <br />
          <Link to="/docs">
            <button className='new-btn'>
              Read Docs
            </button>
          </Link>
          <p className="text-center mt-4 mb-4">Login or Sign Up to save in cloud your generated data</p>
        </Col>
        <Col>
        
          <img src={assets.homepageimg} alt="homepageimg" className='homepageimg' />
        
        </Col>
      </Row>
    </Container>
  );
};

export default Homepage;
