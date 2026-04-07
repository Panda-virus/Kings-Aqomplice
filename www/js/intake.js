/**
 * Kings Aqomplice — Intake Step Logic (used by chat flow)
 * Intake steps are driven by backend; this module provides client-side helpers if needed
 */

(function () {
  'use strict';

  const INTAKE_STEPS = [
    'intake_start',
    'intake_email',
    'intake_name',
    'intake_phone',
    'intake_case_type',
    'intake_description',
    'intake_complete',
  ];

  window.KAIntake = {
    steps: INTAKE_STEPS,
    getStepIndex: function (step) {
      return INTAKE_STEPS.indexOf(step);
    },
    isIntakeStep: function (step) {
      return step && step.startsWith('intake_');
    },
  };
})();
