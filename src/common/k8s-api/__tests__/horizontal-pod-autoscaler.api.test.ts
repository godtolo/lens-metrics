import type { DiContainer } from "@ogre-tools/injectable";
import getHorizontalPodAutoscalerMetrics from "../../../renderer/components/+config-autoscalers/get-hpa-metrics.injectable";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import { HorizontalPodAutoscaler, HpaMetricType } from "../endpoints";

const hpaV2 = {
  apiVersion: "autoscaling/v2",
  kind: "HorizontalPodAutoscaler",
  metadata: {
    name: "hpav2",
    resourceVersion: "1",
    uid: "hpav2",
    namespace: "default",
    selfLink: "/apis/autoscaling/v2/namespaces/default/horizontalpodautoscalers/hpav2",
  },
  spec: {
    maxReplicas: 10,
    scaleTargetRef: {
      kind: "Deployment",
      name: "hpav2deployment",
      apiVersion: "apps/v1",
    }
  }
}

const hpaV1 = {
  apiVersion: "autoscaling/v1",
  kind: "HorizontalPodAutoscaler",
  metadata: {
    name: "hpav1",
    resourceVersion: "1",
    uid: "hpav1",
    namespace: "default",
    selfLink: "/apis/autoscaling/v1/namespaces/default/horizontalpodautoscalers/hpav1",
  },
  spec: {
    maxReplicas: 10,
    scaleTargetRef: {
      kind: "Deployment",
      name: "hpav1deployment",
      apiVersion: "apps/v1",
    }
  }
}

const hpaV2Beta1 = {
  apiVersion: "autoscaling/v2beta1",
  kind: "HorizontalPodAutoscaler",
  metadata: {
    name: "hpav2beta1",
    resourceVersion: "1",
    uid: "hpav1",
    namespace: "default",
    selfLink: "/apis/autoscaling/v2beta1/namespaces/default/horizontalpodautoscalers/hpav2beta1",
  },
  spec: {
    maxReplicas: 10,
    scaleTargetRef: {
      kind: "Deployment",
      name: "hpav1deployment",
      apiVersion: "apps/v1",
    },
  },
}

const hpaV2Beta2 = {
  ...hpaV2Beta1,
  apiVersion: "autoscaling/v2beta2",
}

describe("getHorizontalPodAutoscalerMetrics", () => {
  let di: DiContainer;
  let getMetrics: (hpa: HorizontalPodAutoscaler) => string[];

  beforeEach(() => {
    di = getDiForUnitTesting();

    getMetrics = di.inject(getHorizontalPodAutoscalerMetrics);
  });

  describe("HPA v2", () => {
    it("should return correct empty metrics", () => {
      const hpa = new HorizontalPodAutoscaler(hpaV2);

      expect(getMetrics(hpa)).toHaveLength(0);
    });

    it("should return correct resource metrics", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                target: {
                  type: "Utilization",
                  averageUtilization: 50
                }
              }
            }
          ]
        }
      });

      expect(getMetrics(hpa)[0]).toEqual("unknown / 50%");
    });

    it("should return correct resource metrics with current metrics", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                target: {
                  type: "Utilization",
                  averageUtilization: 50
                }
              }
            }
          ]
        },
        status: {
          currentReplicas: 1,
          desiredReplicas: 10,
          currentMetrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                current: {
                  averageValue: "100m",
                  averageUtilization: 10
                }
              }
            }
          ],
        }
      });

      expect(getMetrics(hpa)[0]).toEqual("10% / 50%");
    });

    it("should return correct resource metrics with current value", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV2,
        spec: {
          ...hpaV2.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                target: {
                  type: "Value",
                  averageValue: "100m"
                }
              }
            }
          ]
        },
        status: {
          currentReplicas: 1,
          desiredReplicas: 10,
          currentMetrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                current: {
                  averageValue: "500m",
                }
              }
            }
          ],
        }
      });

      expect(getMetrics(hpa)[0]).toEqual("500m / 100m");
    });

    it("should return correct container resource metrics", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.ContainerResource,
                containerResource: {
                  name: "cpu",
                  container: "nginx",
                  target: {
                    type: "Utilization",
                    averageUtilization: 60,
                  }
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 60%");
    });

    it("should return correct container resource metrics with current utilization value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.ContainerResource,
                containerResource: {
                  name: "cpu",
                  container: "nginx",
                  target: {
                    type: "Utilization",
                    averageUtilization: 60
                  }
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.ContainerResource,
                containerResource: {
                  name: "cpu",
                  current: {
                    averageUtilization: 10
                  }
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10% / 60%");
    });

    it("should return correct pod metrics", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.Pods,
                pods: {
                  metric: {
                    name: "packets-per-second"
                  },
                  target: {
                    type: "AverageValue",
                    averageValue: "1k"
                  }
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 1k");
    });

    it("should return correct pod metrics with current values", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.Pods,
                pods: {
                  metric: {
                    name: "packets-per-second"
                  },
                  target: {
                    type: "AverageValue",
                    averageValue: "1k"
                  }
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.Pods,
                pods: {
                  metric: {
                    name: "packets-per-second",
                  },
                  current: {
                    averageValue: "10"
                  }
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10 / 1k");
    });

    it("should return correct object metrics", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.Object,
                object: {
                  metric: {
                    name: "requests-per-second"
                  },
                  target: {
                    type: "Value",
                    value: "10k"
                  }
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 10k");
    });

    it("should return correct object metrics with average value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.Object,
                object: {
                  metric: {
                    name: "requests-per-second"
                  },
                  target: {
                    type: "AverageValue",
                    averageValue: "5k"
                  }
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 5k");
    });

    it("should return correct object metrics with current value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.Object,
                object: {
                  metric: {
                    name: "requests-per-second"
                  },
                  target: {
                    type: "Value",
                    value: "5k"
                  }
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.Object,
                object: {
                  metric: {
                    name: "requests-per-second",
                  },
                  current: {
                    value: "10k"
                  }
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10k / 5k");
    });

    it("should return correct external metrics with average value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metric: {
                    name: "queue_messages_ready",
                    selector: {
                      matchLabels: {queue: 'worker_tasks'}
                    }
                  },
                  target: {
                    type: "AverageValue",
                    averageValue: "30"
                  }
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 30 (avg)");
    });

    it("should return correct external metrics with value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metric: {
                    name: "queue_messages_ready",
                    selector: {
                      matchLabels: {queue: 'worker_tasks'}
                    }
                  },
                  target: {
                    type: "Value",
                    value: "30"
                  }
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 30");
    });

    it("should return correct external metrics with current value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metric: {
                    name: "queue_messages_ready",
                    selector: {
                      matchLabels: {queue: 'worker_tasks'}
                    }
                  },
                  target: {
                    type: "Value",
                    value: "30"
                  }
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metric: {
                    name: "queue_messages_ready",
                  },
                  current: {
                    value: "10"
                  }
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10 / 30");
    });

    it("should return correct external metrics with current average value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metric: {
                    name: "queue_messages_ready",
                    selector: {
                      matchLabels: {queue: 'worker_tasks'}
                    }
                  },
                  target: {
                    type: "AverageValue",
                    averageValue: "30"
                  }
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metric: {
                    name: "queue_messages_ready",
                  },
                  current: {
                    averageValue: "10"
                  }
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10 / 30 (avg)");
    });

    it("should return unknown current metrics if names are different", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV2,
          spec: {
            ...hpaV2.spec,
            metrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metric: {
                    name: "queue_messages_ready",
                    selector: {
                      matchLabels: {queue: 'worker_tasks'}
                    }
                  },
                  target: {
                    type: "AverageValue",
                    averageValue: "30"
                  }
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metric: {
                    name: "queue_messages_NOT_ready",
                  },
                  current: {
                    averageValue: "10"
                  }
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 30 (avg)");
    });
  });

  describe("HPA v1", () => {
    it("should return correct empty metrics", () => {
      const hpa = new HorizontalPodAutoscaler(hpaV1);

      expect(getMetrics(hpa)).toHaveLength(0);
    });

    it("should return correct resource metrics", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV1,
        spec: {
          ...hpaV1.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                targetAverageUtilization: 50
              }
            }
          ]
        }
      });

      expect(getMetrics(hpa)[0]).toEqual("unknown / 50%");
    });

    it("should return correct resource metrics with current metrics", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV1,
        spec: {
          ...hpaV1.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                targetAverageUtilization: 50
              }
            }
          ]
        },
        status: {
          currentReplicas: 1,
          desiredReplicas: 10,
          currentMetrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                currentAverageUtilization: 10
              }
            }
          ],
        }
      });
  
      expect(getMetrics(hpa)[0]).toEqual("10% / 50%");
    });
  
    it("should return correct resource metrics with current value", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV1,
        spec: {
          ...hpaV1.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                targetAverageValue: "100m"
              }
            }
          ]
        },
        status: {
          currentReplicas: 1,
          desiredReplicas: 10,
          currentMetrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                currentAverageValue: "500m"
              }
            }
          ],
        }
      });
  
      expect(getMetrics(hpa)[0]).toEqual("500m / 100m");
    });

    it("should return correct container resource metrics", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.ContainerResource,
                containerResource: {
                  name: "cpu",
                  container: "nginx",
                  targetAverageUtilization: 60
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 60%");
    });

    it("should return correct container resource metrics with current utilization value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.ContainerResource,
                containerResource: {
                  name: "cpu",
                  container: "nginx",
                  targetAverageUtilization: 60
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.ContainerResource,
                containerResource: {
                  name: "cpu",
                  currentAverageUtilization: 10
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10% / 60%");
    });

    it("should return correct pod metrics", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.Pods,
                pods: {
                  metricName: "packets-per-second",
                  targetAverageValue: "1k"
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 1k");
    });

    it("should return correct pod metrics with current values", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.Pods,
                pods: {
                  metricName: "packets-per-second",
                  
                  targetAverageValue: "1k"
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.Pods,
                pods: {
                  metricName: "packets-per-second",
                  currentAverageValue: "10"
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10 / 1k");
    });

    it("should return correct object metrics", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.Object,
                object: {
                  metricName: "packets-per-second",
                  targetValue: "10k"
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 10k");
    });

    it("should return correct object metrics with average value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.Object,
                object: {
                  metricName: "packets-per-second",
                  averageValue: "5k"
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 5k");
    });

    it("should return correct object metrics with current value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.Object,
                object: {
                  metricName: "packets-per-second",
                  targetValue: "5k"
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.Object,
                object: {
                  metricName: "packets-per-second",
                  currentValue: "10k"
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10k / 5k");
    });

    it("should return correct external metrics with average value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metricName: "queue_messages_ready",
                  metricSelector: { matchLabels: {queue: 'worker_tasks'} },
                  targetAverageValue: "30"
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 30");
    });

    it("should return correct external metrics with value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metricName: "queue_messages_ready",
                  metricSelector: { matchLabels: {queue: 'worker_tasks'} },
                  targetValue: "30"
                }
              }
            ]
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("unknown / 30");
    });

    it("should return correct external metrics with current value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metricName: "queue_messages_ready",
                  metricSelector: { matchLabels: {queue: 'worker_tasks'} },
                  targetValue: "30"
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metricName: "queue_messages_ready",
                  currentValue: "10"
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10 / 30");
    });

    it("should return correct external metrics with current average value", () => {
      const hpa = new HorizontalPodAutoscaler(
        {
          ...hpaV1,
          spec: {
            ...hpaV1.spec,
            metrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metricName: "queue_messages_ready",
                  metricSelector: { matchLabels: {queue: 'worker_tasks'} },
                  targetAverageValue: "30"
                }
              }
            ]
          },
          status: {
            currentReplicas: 1,
            desiredReplicas: 10,
            currentMetrics: [
              {
                type: HpaMetricType.External,
                external: {
                  metricName: "queue_messages_ready",
                  currentAverageValue: "10"
                }
              }
            ],
          }
        }
      );

      expect(getMetrics(hpa)[0]).toEqual("10 / 30");
    });

    it("should return unknown current metrics if metric names are different", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV1,
        spec: {
          ...hpaV1.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                targetAverageUtilization: 50
              }
            }
          ]
        },
        status: {
          currentReplicas: 1,
          desiredReplicas: 10,
          currentMetrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "memory",
                currentAverageUtilization: 10
              }
            }
          ],
        }
      });
  
      expect(getMetrics(hpa)[0]).toEqual("unknown / 50%");
    });
  });

  describe("HPA v2beta1", () => {
    it("should use metric parser for hpa autoscaling/v2", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV2Beta1,
        spec: {
          ...hpaV2Beta1.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                target: {
                  type: "Utilization",
                  averageUtilization: 50
                }
              }
            }
          ]
        }
      });

      expect(getMetrics(hpa)[0]).toEqual("unknown / 50%");
    });

    it("should return unknown metrics for invalid v2 metric format", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV2Beta1,
        spec: {
          ...hpaV2Beta1.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                targetAverageUtilization: 50
              }
            }
          ]
        }
      });

      expect(getMetrics(hpa)[0]).toEqual("unknown / unknown");
    });
  });

  describe("HPA v2beta2", () => {
    it("should use metric parser for hpa autoscaling/v2", () => {
      const hpa = new HorizontalPodAutoscaler({
        ...hpaV2Beta2,
        spec: {
          ...hpaV2Beta2.spec,
          metrics: [
            {
              type: HpaMetricType.Resource,
              resource: {
                name: "cpu",
                target: {
                  type: "Utilization",
                  averageUtilization: 50
                }
              }
            }
          ]
        }
      });

      expect(getMetrics(hpa)[0]).toEqual("unknown / 50%");
    });
  });
});