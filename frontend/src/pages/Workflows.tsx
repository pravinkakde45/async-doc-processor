import React, { useEffect } from 'react';
import { useTopBarContext } from '../context/TopBarContext';
import { Briefcase, Settings, Plus, Play, Pause } from 'lucide-react';
import './Workflows.css';

export const Workflows: React.FC = () => {
  const { setTopbarTitle } = useTopBarContext();

  useEffect(() => {
    setTopbarTitle(
      <>
        <span>Platform</span> {'>'} Automated Workflows
      </>
    );
  }, [setTopbarTitle]);

  const workflows = [
    { id: 1, name: 'Invoice Processing Pipeline', type: 'Financial', active: true, docs: 1240 },
    { id: 2, name: 'Employee Onboarding (Resumes)', type: 'HR', active: true, docs: 89 },
    { id: 3, name: 'Vendor Contract OCR', type: 'Legal', active: false, docs: 340 },
  ];

  return (
    <div className="workflows-page">
      <div className="dashboard-header">
        <div className="header-text">
          <h1>Workflows</h1>
          <p>Configure automated routing and logic pipelines for different document types.</p>
        </div>
        <button className="btn-primary">
          <Plus size={18} /> Create Workflow
        </button>
      </div>

      <div className="card table-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>WORKFLOW NAME</th>
                <th>CATEGORY</th>
                <th>DOCS PROCESSED</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map(wf => (
                <tr key={wf.id} className="clickable-row">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="table-icon">
                        <Briefcase className="text-primary" size={20} />
                      </div>
                      <div className="font-medium">{wf.name}</div>
                    </div>
                  </td>
                  <td>{wf.type}</td>
                  <td className="font-semibold">{wf.docs}</td>
                  <td>
                    {wf.active ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-default">Paused</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="icon-btn-small" title={wf.active ? "Pause Workflow" : "Start Workflow"}>
                        {wf.active ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button className="icon-btn-small" title="Settings">
                        <Settings size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
