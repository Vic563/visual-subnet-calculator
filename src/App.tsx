import React from 'react';
import { useState, useEffect } from 'react';

interface SubnetInfo {
  subnetAddress: string;
  netmask: string;
  range: string;
  useableIPs: string;
  hosts: number;
  id?: string;
  parentId?: string;
}

const App = () => {
  const [networkAddress, setNetworkAddress] = useState('192.168.0.0');
  const [maskBits, setMaskBits] = useState('24');
  const [subnets, setSubnets] = useState<SubnetInfo[]>([]);
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [showColumns, setShowColumns] = useState({
    subnetAddress: true,
    netmask: true,
    range: true,
    useableIPs: true,
    hosts: true,
    divide: true,
    join: true
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const calculateNetmask = (bits: number): string => {
    const mask = new Array(4).fill(0);
    for (let i = 0; i < bits; i++) {
      const octet = Math.floor(i / 8);
      const bit = 7 - (i % 8);
      mask[octet] |= 1 << bit;
    }
    return mask.join('.');
  };

  const calculateBroadcastAddress = (ip: string, bits: number): string => {
    const ipParts = ip.split('.').map(Number);
    const hostBits = 32 - bits;
    const broadcast = [...ipParts];
    
    for (let i = 3; i >= 0; i--) {
      const bits = Math.min(8, Math.max(0, hostBits - (3-i)*8));
      if (bits > 0) {
        broadcast[i] = broadcast[i] | (Math.pow(2, bits) - 1);
      }
    }
    
    return broadcast.join('.');
  };

  const incrementIP = (ip: string): string => {
    const parts = ip.split('.').map(Number);
    for (let i = 3; i >= 0; i--) {
      parts[i]++;
      if (parts[i] <= 255) break;
      parts[i] = 0;
    }
    return parts.join('.');
  };

  const decrementIP = (ip: string): string => {
    const parts = ip.split('.').map(Number);
    for (let i = 3; i >= 0; i--) {
      parts[i]--;
      if (parts[i] >= 0) break;
      parts[i] = 255;
    }
    return parts.join('.');
  };

  const calculateSubnet = () => {
    const bits = parseInt(maskBits);
    if (isNaN(bits) || bits < 0 || bits > 32) return;

    const netmask = calculateNetmask(bits);
    const broadcastAddress = calculateBroadcastAddress(networkAddress, bits);
    const firstUseable = incrementIP(networkAddress);
    const lastUseable = decrementIP(broadcastAddress);
    const numHosts = Math.pow(2, 32 - bits) - 2;

    const subnet: SubnetInfo = {
      id: crypto.randomUUID(),
      subnetAddress: networkAddress + '/' + bits,
      netmask,
      range: networkAddress + ' - ' + broadcastAddress,
      useableIPs: firstUseable + ' - ' + lastUseable,
      hosts: numHosts
    };

    setSubnets([subnet]);
  };

  const handleDivide = (subnet: SubnetInfo) => {
    const [address, bits] = subnet.subnetAddress.split('/');
    const newBits = parseInt(bits) + 1;
    if (newBits > 32) return;

    const firstSubnet: SubnetInfo = {
      id: crypto.randomUUID(),
      parentId: subnet.id,
      subnetAddress: address + '/' + newBits,
      netmask: calculateNetmask(newBits),
      range: address + ' - ' + calculateBroadcastAddress(address, newBits),
      useableIPs: incrementIP(address) + ' - ' + decrementIP(calculateBroadcastAddress(address, newBits)),
      hosts: Math.pow(2, 32 - newBits) - 2
    };

    const secondStart = incrementIP(calculateBroadcastAddress(address, newBits));
    const secondSubnet: SubnetInfo = {
      id: crypto.randomUUID(),
      parentId: subnet.id,
      subnetAddress: secondStart + '/' + newBits,
      netmask: calculateNetmask(newBits),
      range: secondStart + ' - ' + calculateBroadcastAddress(secondStart, newBits),
      useableIPs: incrementIP(secondStart) + ' - ' + decrementIP(calculateBroadcastAddress(secondStart, newBits)),
      hosts: Math.pow(2, 32 - newBits) - 2
    };

    setSubnets(prev => {
      const filtered = prev.filter(s => s.id !== subnet.id);
      return [...filtered, firstSubnet, secondSubnet].sort((a, b) => {
        const aIP = a.subnetAddress.split('/')[0].split('.').map(Number);
        const bIP = b.subnetAddress.split('/')[0].split('.').map(Number);
        for (let i = 0; i < 4; i++) {
          if (aIP[i] !== bIP[i]) return aIP[i] - bIP[i];
        }
        return 0;
      });
    });
  };

  const handleJoin = (subnet: SubnetInfo) => {
    if (!subnet.parentId) return;

    const siblings = subnets.filter(s => s.parentId === subnet.parentId);
    if (siblings.length !== 2) return;

    const [firstIP] = siblings[0].subnetAddress.split('/');
    const [, bits] = siblings[0].subnetAddress.split('/');
    const parentBits = parseInt(bits) - 1;

    const parentSubnet: SubnetInfo = {
      id: subnet.parentId,
      subnetAddress: firstIP + '/' + parentBits,
      netmask: calculateNetmask(parentBits),
      range: firstIP + ' - ' + calculateBroadcastAddress(firstIP, parentBits),
      useableIPs: incrementIP(firstIP) + ' - ' + decrementIP(calculateBroadcastAddress(firstIP, parentBits)),
      hosts: Math.pow(2, 32 - parentBits) - 2
    };

    const getAllDescendants = (subnetId: string): string[] => {
      const children = subnets.filter(s => s.parentId === subnetId);
      return [
        subnetId,
        ...children.flatMap(child => getAllDescendants(child.id!))
      ];
    };

    const descendantIds = getAllDescendants(subnet.parentId);

    setSubnets(prev => 
      [...prev.filter(s => !descendantIds.includes(s.id!)), parentSubnet]
        .sort((a, b) => {
          const aIP = a.subnetAddress.split('/')[0].split('.').map(Number);
          const bIP = b.subnetAddress.split('/')[0].split('.').map(Number);
          for (let i = 0; i < 4; i++) {
            if (aIP[i] !== bIP[i]) return aIP[i] - bIP[i];
          }
          return 0;
        })
    );
  };

  const handleReset = () => {
    setNetworkAddress('192.168.0.0');
    setMaskBits('24');
    setSubnets([{
      id: crypto.randomUUID(),
      subnetAddress: '192.168.0.0/24',
      netmask: '255.255.255.0',
      range: '192.168.0.0 - 192.168.0.255',
      useableIPs: '192.168.0.1 - 192.168.0.254',
      hosts: 254
    }]);
  };

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: darkMode ? 'var(--bg-dark)' : 'var(--bg-light)',
      color: darkMode ? 'var(--text-light)' : 'var(--text-dark)',
      minHeight: '100vh'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px',
        padding: '16px',
        borderRadius: '12px',
        background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
      }}>
        <h1 style={{ 
          fontSize: '2.5em',
          fontWeight: '700',
          color: darkMode ? '#fff' : '#6366f1',
          marginBottom: '0',
          padding: '4px 0',
          letterSpacing: '-0.5px',
          textShadow: darkMode ? '0 0 20px rgba(99, 102, 241, 0.5)' : 'none'
        }}>
          Visual Subnet Calculator
        </h1>
        <button
          onClick={toggleTheme}
          style={{ 
            padding: '12px',
            fontSize: '1.2em',
            border: 'none',
            background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            cursor: 'pointer',
            color: darkMode ? 'var(--text-light)' : 'var(--text-dark)',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
      
      <div style={{ 
        marginBottom: '32px',
        padding: '24px',
        borderRadius: '12px',
        background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
      }}>
        <p style={{ 
          fontSize: '1.25em',
          marginBottom: '16px',
          color: darkMode ? 'var(--primary-dark)' : 'var(--primary-light)',
          fontWeight: '500'
        }}>
          Enter the network you wish to subnet:
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '1.1em', fontWeight: '500' }}>Network Address</label>
          <input
            type="text"
            value={networkAddress}
            onChange={(e) => setNetworkAddress(e.target.value)}
            style={{ 
              padding: '8px 12px',
              fontSize: '1.1em',
              width: '200px',
              border: 'none',
              borderRadius: '8px',
              background: darkMode ? 'rgba(255,255,255,0.1)' : 'white',
              color: darkMode ? 'var(--text-light)' : 'var(--text-dark)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
          <span style={{ fontSize: '1.2em', fontWeight: '500' }}>/</span>
          <input
            type="text"
            value={maskBits}
            onChange={(e) => setMaskBits(e.target.value)}
            style={{ 
              padding: '8px 12px',
              fontSize: '1.1em',
              width: '60px',
              border: 'none',
              borderRadius: '8px',
              background: darkMode ? 'rgba(255,255,255,0.1)' : 'white',
              color: darkMode ? 'var(--text-light)' : 'var(--text-dark)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
          <button
            onClick={calculateSubnet}
            style={{ 
              padding: '8px 20px',
              fontSize: '1.1em',
              border: 'none',
              borderRadius: '8px',
              background: darkMode ? 'var(--primary-dark)' : 'var(--primary-light)',
              cursor: 'pointer',
              color: 'white',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Update
          </button>
          <button
            onClick={handleReset}
            style={{ 
              padding: '8px 20px',
              fontSize: '1.1em',
              border: 'none',
              borderRadius: '8px',
              background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              cursor: 'pointer',
              color: darkMode ? 'var(--text-light)' : 'var(--text-dark)',
              fontWeight: '500'
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={{ 
        marginBottom: '32px',
        padding: '24px',
        borderRadius: '12px',
        background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
      }}>
        <p style={{ 
          fontSize: '1.25em',
          marginBottom: '16px',
          color: darkMode ? 'var(--primary-dark)' : 'var(--primary-light)',
          fontWeight: '500'
        }}>
          Show columns:
        </p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {Object.entries(showColumns)
            .filter(([key]) => !['divide', 'join'].includes(key))
            .map(([key, value]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setShowColumns(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  style={{ 
                    width: '18px', 
                    height: '18px',
                    accentColor: darkMode ? 'var(--primary-dark)' : 'var(--primary-light)',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '1.1em', fontWeight: '500' }}>
                  {key === 'useableIPs' ? 'Useable IPs' : 
                   key === 'subnetAddress' ? 'Subnet Address' :
                   key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
              </label>
          ))}
        </div>
      </div>

      {subnets.length > 0 && (
        <div style={{ 
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '1.1em',
            background: darkMode ? 'rgba(255,255,255,0.05)' : 'white'
          }}>
            <thead>
              <tr style={{ 
                background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.02)'
              }}>
                {showColumns.subnetAddress && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Subnet Address</th>}
                {showColumns.netmask && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Netmask</th>}
                {showColumns.range && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Range of addresses</th>}
                {showColumns.useableIPs && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Useable IPs</th>}
                {showColumns.hosts && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Hosts</th>}
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subnets.map((subnet) => (
                <tr key={subnet.id} style={{
                  borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                }}>
                  {showColumns.subnetAddress && <td style={{ padding: '12px 16px' }}>{subnet.subnetAddress}</td>}
                  {showColumns.netmask && <td style={{ padding: '12px 16px' }}>{subnet.netmask}</td>}
                  {showColumns.range && <td style={{ padding: '12px 16px' }}>{subnet.range}</td>}
                  {showColumns.useableIPs && <td style={{ padding: '12px 16px' }}>{subnet.useableIPs}</td>}
                  {showColumns.hosts && <td style={{ padding: '12px 16px' }}>{subnet.hosts}</td>}
                  <td style={{ padding: '12px 16px' }}>
                    <button 
                      onClick={() => handleDivide(subnet)}
                      style={{ 
                        marginRight: '8px', 
                        padding: '6px 16px', 
                        border: 'none',
                        borderRadius: '6px',
                        background: darkMode ? 'var(--primary-dark)' : 'var(--primary-light)',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.9em'
                      }}
                    >
                      Divide
                    </button>
                    {subnet.parentId && (
                      <button 
                        onClick={() => handleJoin(subnet)}
                        style={{ 
                          padding: '6px 16px', 
                          border: 'none',
                          borderRadius: '6px',
                          background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          color: darkMode ? 'var(--text-light)' : 'var(--text-dark)',
                          cursor: 'pointer',
                          fontWeight: '500',
                          fontSize: '0.9em'
                        }}
                      >
                        Join
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default App; 