import { TypeAnimation } from 'react-type-animation';
import './WelcomePage.module.css'
import { CustomButton } from '@/shared/ui';
import { Link } from 'react-router-dom';

const WelcomePage = () => {
    return (
        <div className='welcomepage'>
            <div className="welcomepage__wrapper">
                <span className="welcomepage__wrapper-title">
                    <TypeAnimation sequence={[
                        'Welcome',
                        1000,
                        'Welcome to the',
                        1000,
                        'Welcome',
                        1000,
                        'Welcome to the NetSim',
                        1000
                    ]}
                        wrapper="span"
                        cursor={true}
                        repeat={Infinity} />
                </span>
                <span className="welcomepage__wrapper-subtitle">Придумай, смоделируй, реализуй</span>
                <Link to={'/editor'} style={{ textDecoration: 'none' }}><CustomButton>Начать</CustomButton></Link>
            </div>
        </div>
    )
}

export default WelcomePage; 