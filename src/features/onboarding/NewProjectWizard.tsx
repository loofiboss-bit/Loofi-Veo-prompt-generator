import React from 'react';
import Icon from '@shared/components/ui/Icon';
import { PROJECT_TEMPLATES, ProjectTemplate } from '@core/config/projectTemplates';

interface NewProjectWizardProps {
  onSelectTemplate: (template: ProjectTemplate) => void;
  onClose: () => void;
  isOpen: boolean;
}

const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  onSelectTemplate,
  onClose,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in-up">
      <div className="max-w-5xl w-full flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl mb-2">
            <Icon name="film" className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            What are you building?
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
            Select a starting point to configure the AI studio for your specific workflow.
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {PROJECT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="group relative flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-6 text-left hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-900/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Gradient Background Effect on Hover */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${template.gradient}`}
              />

              <div
                className={`w-12 h-12 rounded-xl mb-6 flex items-center justify-center bg-gradient-to-br ${template.gradient} shadow-lg`}
              >
                <Icon name={template.icon} className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                {template.label}
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300">
                {template.description}
              </p>

              <div className="mt-auto pt-6 flex items-center text-xs font-semibold text-slate-500 group-hover:text-cyan-400">
                <span>Start Project</span>
                <Icon
                  name="arrow-right"
                  className="w-3 h-3 ml-2 transform group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>
          ))}
        </div>

        {/* Footer / Skip */}
        <div className="mt-12">
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span>Start from Scratch (Blank Canvas)</span>
            <Icon name="chevron-down" className="w-3 h-3 -rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewProjectWizard;
